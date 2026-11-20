import "server-only";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { queueEmail } from "@/server/services/email";

export type AmbassadorConfig = {
  enabled: boolean;
  referralsRequired: number;
  commissionCents: number;
  withdrawalMinCents: number;
  qualifyingTask: "referral_deposit" | "referral_first_purchase";
  qualifyingDepositMinor: number;
  qualifyingProxyDurationSeconds: number;
  nextPayoutAt: Date | null;
};

export async function getAmbassadorConfig(tx?: SqlTransaction): Promise<AmbassadorConfig> {
  const db = tx ?? (await getDb());
  const result = await db.query<{ key: string; value: unknown }>(
    `select key, value from app_settings
      where key in (
        'ambassador_enabled','ambassador_referrals_required',
        'ambassador_commission_usd_cents','ambassador_withdrawal_min_usd_cents',
        'ambassador_qualifying_task','ambassador_qualifying_deposit_minor',
        'ambassador_next_payout_at','referral_qualifying_proxy_duration_seconds'
      )`,
  );
  const map = new Map(result.rows.map((row) => [row.key, row.value]));
  const task = String(map.get("ambassador_qualifying_task") ?? "referral_deposit");
  return {
    enabled: map.get("ambassador_enabled") !== false,
    referralsRequired: Math.max(1, Math.min(Number(map.get("ambassador_referrals_required") ?? 2), 100)),
    commissionCents: Math.max(1, Number(map.get("ambassador_commission_usd_cents") ?? 300)),
    withdrawalMinCents: Math.max(1000, Number(map.get("ambassador_withdrawal_min_usd_cents") ?? 1000)),
    qualifyingTask:
      task === "referral_first_purchase" ? "referral_first_purchase" : "referral_deposit",
    qualifyingDepositMinor: Math.max(0, Number(map.get("ambassador_qualifying_deposit_minor") ?? 200_000)),
    qualifyingProxyDurationSeconds: Math.max(
      86_400,
      Number(map.get("referral_qualifying_proxy_duration_seconds") ?? 604_800),
    ),
    nextPayoutAt: (() => {
      const raw = map.get("ambassador_next_payout_at");
      if (typeof raw !== "string" || !raw.trim()) return null;
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })(),
  };
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function getAmbassadorWalletBalance(
  tx: SqlTransaction,
  userId: string,
) {
  const result = await tx.query<{ available: unknown; earned: unknown }>(
    `select
       coalesce((select sum(amount_usd_cents) from ambassador_ledger where user_id=$1),0)::int as available,
       coalesce((select sum(amount_usd_cents) from ambassador_ledger where user_id=$1 and entry_type='commission'),0)::int as earned`,
    [userId],
  );
  return {
    availableCents: Number(result.rows[0]?.available ?? 0),
    earnedCents: Number(result.rows[0]?.earned ?? 0),
  };
}

async function awardCommission(
  tx: SqlTransaction,
  input: {
    ambassadorId: string;
    referralId: string;
    commissionCents: number;
    referralName: string;
    ambassadorName: string;
    ambassadorEmail: string;
  },
) {
  const inserted = await tx.query<{ id: string }>(
    `insert into ambassador_commissions
       (ambassador_id, referral_id, amount_usd_cents, status, description)
     values ($1,$2,$3,'available','Ambassador referral commission')
     on conflict (referral_id) do nothing
     returning id`,
    [input.ambassadorId, input.referralId, input.commissionCents],
  );
  const commissionId = inserted.rows[0]?.id;
  if (!commissionId) return null;

  const balance = await getAmbassadorWalletBalance(tx, input.ambassadorId);
  await tx.query(
    `insert into ambassador_ledger
       (user_id, entry_type, amount_usd_cents, reference, referral_id, description)
     values ($1,'commission',$2,$3,$4,'Ambassador referral commission')`,
    [
      input.ambassadorId,
      input.commissionCents,
      `commission:${input.referralId}`,
      input.referralId,
    ],
  );
  await queueEmail(tx, {
    type: "ambassador_commission",
    userId: input.ambassadorId,
    recipient: input.ambassadorEmail,
    data: {
      name: input.ambassadorName,
      referralName: input.referralName,
      commissionLabel: usd(input.commissionCents),
      availableLabel: usd(balance.availableCents + input.commissionCents),
    },
    dedupeKey: `ambassador_commission:${commissionId}`,
  });
  await notifyUser(tx, {
    userId: input.ambassadorId,
    type: "system",
    title: "Referral reward earned",
    body: `${usd(input.commissionCents)} was added to your separate USD reward balance for a qualifying 7-day+ proxy purchase.`,
    href: "/dashboard/referrals",
  });
  await writeAuditLog(tx, {
    actorUserId: null,
    actorRole: "system",
    action: "ambassador.commission_awarded",
    entityType: "ambassador_commission",
    entityId: commissionId,
    metadata: {
      ambassadorId: input.ambassadorId,
      referralId: input.referralId,
      amountUsdCents: input.commissionCents,
    },
  });
  return commissionId;
}

/**
 * Called from completed deposit / first-purchase flows. It never trusts a
 * client-submitted status or amount. It only evaluates referrals already
 * recorded in the database.
 */
export async function qualifyReferralForAmbassador(
  tx: SqlTransaction,
  input: {
    refereeId: string;
    eventType: "deposit" | "purchase";
    eventRef: string;
    durationSeconds?: number;
  },
) {
  const config = await getAmbassadorConfig(tx);
  if (!config.enabled) return null;

  // A deposit event only checks whether a qualifying purchase already exists.
  // The purchase requirement can never be replaced by a wallet deposit.
  let orderId = input.eventRef;
  if (input.eventType === "deposit") {
    const existing = await tx.query<{ id: string }>(
      `select o.id
         from orders o join products p on p.id = o.product_id
        where o.user_id = $1 and o.status = 'completed'
          and p.duration_seconds >= $2
        order by o.completed_at asc nulls last, o.created_at asc
        limit 1`,
      [input.refereeId, config.qualifyingProxyDurationSeconds],
    );
    if (!existing.rows[0]) return null;
    orderId = existing.rows[0].id;
  }

  // Verify the actual completed order and product duration in the database.
  const orderResult = await tx.query<{ id: string; durationSeconds: number }>(
    `select o.id, p.duration_seconds as "durationSeconds"
       from orders o join products p on p.id = o.product_id
      where o.id = $1 and o.user_id = $2 and o.status = 'completed'
      limit 1`,
    [orderId, input.refereeId],
  );
  const order = orderResult.rows[0];
  if (!order) return null;
  if (Number(order.durationSeconds) < config.qualifyingProxyDurationSeconds) return null;

  const referralResult = await tx.query<{
    id: string;
    referrerId: string;
    referrerEmail: string;
    referrerName: string;
    refereeName: string;
    qualifyingDepositId: string | null;
  }>(
    `select r.id, r.referrer_id as "referrerId",
            p.email as "referrerEmail",
            coalesce(p.display_name, p.username) as "referrerName",
            referee.username as "refereeName",
            r.qualifying_deposit_id as "qualifyingDepositId"
       from referrals r
       join profiles p on p.id = r.referrer_id
       join profiles referee on referee.id = r.referee_id
      where r.referee_id = $1 and r.ambassador_qualified_at is null
      limit 1 for update of r`,
    [input.refereeId],
  );
  const referral = referralResult.rows[0];
  if (!referral) return null;

  const updated = await tx.query(
    `update referrals
        set ambassador_qualified_at=now(), ambassador_event_type='purchase',
            ambassador_event_ref=$2, updated_at=now()
      where id=$1 and ambassador_qualified_at is null
      returning id`,
    [referral.id, order.id],
  );
  if (!updated.rows[0]) return null;

  const countResult = await tx.query<{ count: number }>(
    `select count(*)::int as count from referrals
      where referrer_id=$1 and ambassador_qualified_at is not null`,
    [referral.referrerId],
  );
  const qualifiedCount = Number(countResult.rows[0]?.count ?? 0);

  let ambassador = await tx.query<{ userId: string }>(
    `select user_id as "userId" from ambassador_profiles where user_id=$1 limit 1`,
    [referral.referrerId],
  );
  let promoted = false;
  if (!ambassador.rows[0] && qualifiedCount >= config.referralsRequired) {
    const inserted = await tx.query<{ userId: string }>(
      `insert into ambassador_profiles
         (user_id, promoted_at, qualified_referrals_at_promotion)
       values ($1,now(),$2)
       on conflict (user_id) do nothing
       returning user_id as "userId"`,
      [referral.referrerId, qualifiedCount],
    );
    if (inserted.rows[0]) {
      promoted = true;
      ambassador = inserted;
      await queueEmail(tx, {
        type: "ambassador_promotion",
        userId: referral.referrerId,
        recipient: referral.referrerEmail,
        data: {
          name: referral.referrerName,
          progress: `${qualifiedCount}/${config.referralsRequired}`,
          commissionLabel: `${usd(config.commissionCents)} per qualifying referral`,
          thresholdLabel: `${usd(config.withdrawalMinCents)} minimum USDT payout`,
        },
        dedupeKey: `ambassador_promotion:${referral.referrerId}`,
      });
      await notifyUser(tx, {
        userId: referral.referrerId,
        type: "system",
        title: "You are now a BUYBIZ Ambassador",
        body: `You qualified with ${qualifiedCount} successful referrals. Your USD ambassador balance is now active.`,
        href: "/dashboard/referrals",
      });
      await writeAuditLog(tx, {
        actorUserId: null,
        actorRole: "system",
        action: "ambassador.promoted",
        entityType: "profile",
        entityId: referral.referrerId,
        metadata: {
        qualifiedCount,
        required: config.referralsRequired,
        qualifyingOrderId: order.id,
        durationSeconds: order.durationSeconds,
      },
      });
    }
  }

  // Every valid referral earns the normal $3 USD reward, whether or not the
  // referrer has reached Ambassador status yet. The unique referral_id on
  // ambassador_commissions prevents duplicate rewards.
  const qualified = await tx.query<{
    id: string;
    refereeName: string;
  }>(
    `select r.id, p.username as "refereeName"
       from referrals r
       join profiles p on p.id=r.referee_id
      where r.referrer_id=$1 and r.ambassador_qualified_at is not null
      order by r.ambassador_qualified_at asc`,
    [referral.referrerId],
  );
  let commissions = 0;
  for (const row of qualified.rows) {
    const id = await awardCommission(tx, {
      ambassadorId: referral.referrerId,
      referralId: row.id,
      commissionCents: config.commissionCents,
      referralName: row.refereeName,
      ambassadorName: referral.referrerName,
      ambassadorEmail: referral.referrerEmail,
    });
    if (id) commissions += 1;
  }
  return { promoted, qualifiedCount, commissions };
}

export async function getAmbassadorDashboard(userId: string) {
  const db = await getDb();
  const config = await getAmbassadorConfig();
  const profile = await db.query<{
    isAmbassador: boolean;
    promotedAt: Date | null;
  }>(
    `select exists(select 1 from ambassador_profiles where user_id=$1) as "isAmbassador",
            (select promoted_at from ambassador_profiles where user_id=$1) as "promotedAt"`,
    [userId],
  );
  const counts = await db.query<{
    qualified: number;
    total: number;
    registered: number;
    pending: number;
    rejected: number;
  }>(
    `select
       count(*) filter (where ambassador_qualified_at is not null)::int as qualified,
       count(*) filter (where status = 'registered')::int as registered,
       count(*) filter (where status in ('pending','qualified'))::int as pending,
       count(*) filter (where status = 'rejected')::int as rejected,
       count(*)::int as total
     from referrals where referrer_id=$1`,
    [userId],
  );
  const balance = await db.query<{ available: unknown; earned: unknown }>(
    `select
       coalesce((select sum(amount_usd_cents) from ambassador_ledger where user_id=$1),0)::int as available,
       coalesce((select sum(amount_usd_cents) from ambassador_ledger where user_id=$1 and entry_type='commission'),0)::int as earned`,
    [userId],
  );
  const withdrawals = await db.query<{
    id: string;
    amountCents: number;
    status: string;
    walletAddress: string;
    transactionHash: string | null;
    requestedAt: Date;
    paidAt: Date | null;
    rejectionReason: string | null;
  }>(
    `select id, amount_usd_cents as "amountCents", status,
            wallet_address as "walletAddress", transaction_hash as "transactionHash",
            requested_at as "requestedAt", paid_at as "paidAt",
            rejection_reason as "rejectionReason"
       from ambassador_withdrawals where user_id=$1
      order by requested_at desc limit 50`,
    [userId],
  );
  const address = await db.query<{
    id: string;
    address: string;
    status: string;
    rejectionReason: string | null;
    createdAt: Date;
  }>(
    `select id, address, status, rejection_reason as "rejectionReason",
            created_at as "createdAt"
       from ambassador_wallet_addresses where user_id=$1
      order by created_at desc limit 1`,
    [userId],
  );
  const commissions = await db.query<{
    id: string;
    amountCents: number;
    status: string;
    createdAt: Date;
    referralUsername: string;
  }>(
    `select c.id, c.amount_usd_cents as "amountCents", c.status,
            c.created_at as "createdAt", p.username as "referralUsername"
       from ambassador_commissions c
       join referrals r on r.id=c.referral_id
       join profiles p on p.id=r.referee_id
      where c.ambassador_id=$1 order by c.created_at desc limit 30`,
    [userId],
  );
  const open = withdrawals.rows.find((row) =>
    ["pending", "processing"].includes(row.status),
  );
  const verifiedAddress = address.rows[0]?.status === "verified" ? address.rows[0] : null;
  return {
    config,
    isAmbassador: Boolean(profile.rows[0]?.isAmbassador),
    promotedAt: profile.rows[0]?.promotedAt ?? null,
    qualified: Number(counts.rows[0]?.qualified ?? 0),
    total: Number(counts.rows[0]?.total ?? 0),
    registered: Number(counts.rows[0]?.registered ?? 0),
    pending: Number(counts.rows[0]?.pending ?? 0),
    rejected: Number(counts.rows[0]?.rejected ?? 0),
    availableCents: Number(balance.rows[0]?.available ?? 0),
    earnedCents: Number(balance.rows[0]?.earned ?? 0),
    withdrawals: withdrawals.rows,
    address: address.rows[0] ?? null,
    verifiedAddress,
    openWithdrawal: open ?? null,
    commissions: commissions.rows,
  };
}

export async function submitAmbassadorAddress(userId: string, rawAddress: string) {
  const address = rawAddress.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new AppError(
      "VALIDATION",
      "Enter a valid USDT BEP20 address. It must start with 0x and contain 40 hexadecimal characters.",
    );
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Serialize submissions per account. Pending and verified addresses are
    // locked against replacement; only a rejected address may be resubmitted.
    await tx.query(`select id from profiles where id=$1 for update`, [userId]);
    const latest = await tx.query<{ id: string; status: string; address: string }>(
      `select id,status,address from ambassador_wallet_addresses
        where user_id=$1 order by created_at desc limit 1 for update`,
      [userId],
    );
    const current = latest.rows[0];
    if (current?.status === "pending") {
      throw new AppError(
        "CONFLICT",
        "Your wallet address is already pending verification. You cannot submit another address until an administrator reviews it.",
      );
    }
    if (current?.status === "verified") {
      throw new AppError(
        "CONFLICT",
        "Your verified wallet address is locked. Contact support if it needs to be changed.",
      );
    }
    const inserted = await tx.query<{ id: string }>(
      `insert into ambassador_wallet_addresses (user_id, address, network, status)
       values ($1,$2,'BEP20','pending') returning id`,
      [userId, address],
    );
    await writeAuditLog(tx, {
      actorUserId: userId, actorRole: "customer", action: "ambassador.address_submitted",
      entityType: "ambassador_wallet_address", entityId: inserted.rows[0].id,
      metadata: { previousStatus: current?.status ?? "none", network: "BEP20" },
    });
    return inserted.rows[0].id;
  });
}

export async function requestAmbassadorWithdrawal(userId: string, amountCents: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new AppError("VALIDATION", "Enter a valid USD payout amount.");
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    const config = await getAmbassadorConfig(tx);
    if (!config.enabled) throw new AppError("CONFLICT", "The Ambassador Programme is paused.");
    const ambassador = await tx.query(
      `select 1 from ambassador_profiles where user_id=$1 limit 1 for update`,
      [userId],
    );
    if (!ambassador.rows[0]) {
      throw new AppError("FORBIDDEN", "Only Ambassadors can request payouts.");
    }
    const open = await tx.query(
      `select 1 from ambassador_withdrawals
        where user_id=$1 and status in ('pending','processing') limit 1`,
      [userId],
    );
    if (open.rows[0]) {
      throw new AppError(
        "CONFLICT",
        "You already have a payout in progress. Please wait for it to finish.",
      );
    }
    if (amountCents < config.withdrawalMinCents) {
      throw new AppError(
        "VALIDATION",
        `The minimum payout is ${usd(config.withdrawalMinCents)}.`,
      );
    }
    const address = await tx.query<{ address: string }>(
      `select address from ambassador_wallet_addresses
        where user_id=$1 and status='verified'
        order by verified_at desc nulls last limit 1`,
      [userId],
    );
    if (!address.rows[0]) {
      throw new AppError(
        "VALIDATION",
        "Add and verify a USDT BEP20 wallet address before requesting a payout.",
      );
    }
    const balance = await getAmbassadorWalletBalance(tx, userId);
    if (amountCents > balance.availableCents) {
      throw new AppError(
        "INSUFFICIENT_BALANCE",
        `You can withdraw up to ${usd(balance.availableCents)} from your available ambassador balance.`,
      );
    }
    const profile = await tx.query<{ email: string; username: string; displayName: string | null }>(
      `select email, username, display_name as "displayName" from profiles where id=$1 limit 1`,
      [userId],
    );
    const row = profile.rows[0];
    if (!row) throw new AppError("NOT_FOUND", "Your profile could not be found.");
    const inserted = await tx.query<{ id: string }>(
      `insert into ambassador_withdrawals
         (user_id, amount_usd_cents, status, wallet_address, network, requested_at)
       values ($1,$2,'pending',$3,'BEP20',now())
       returning id`,
      [userId, amountCents, address.rows[0].address],
    );
    const withdrawalId = inserted.rows[0].id;
    await tx.query(
      `insert into ambassador_ledger
         (user_id, entry_type, amount_usd_cents, reference, withdrawal_id, description)
       values ($1,'withdrawal_reserve',$2,$3,$4,'Ambassador payout reserved')`,
      [userId, -amountCents, `withdrawal:reserve:${withdrawalId}`, withdrawalId],
    );
    await queueEmail(tx, {
      type: "payout_requested",
      userId,
      recipient: row.email,
      data: {
        name: row.displayName || row.username,
        amountLabel: usd(amountCents),
        address: address.rows[0].address,
        requestedAt: new Date().toISOString(),
      },
      dedupeKey: `payout_requested:${withdrawalId}`,
    });
    await notifyUser(tx, {
      userId,
      type: "system",
      title: "Payout request received",
      body: `Your ${usd(amountCents)} USDT payout request is pending review. Processing can take up to 3 days.`,
      href: "/dashboard/referrals",
    });
    await writeAuditLog(tx, {
      actorUserId: userId,
      actorRole: "customer",
      action: "ambassador.payout_requested",
      entityType: "ambassador_withdrawal",
      entityId: withdrawalId,
      metadata: { amountCents, address: address.rows[0].address, network: "BEP20" },
    });
    return { id: withdrawalId, amountCents };
  });
}

export async function verifyAmbassadorAddress(
  tx: SqlTransaction,
  input: { addressId: string; adminId: string; adminRole: string; approve: boolean; reason?: string },
) {
  const target = await tx.query<{ userId: string; address: string; status: string }>(
    `select user_id as "userId", address, status from ambassador_wallet_addresses
      where id=$1 limit 1 for update`,
    [input.addressId],
  );
  const row = target.rows[0];
  if (!row) throw new AppError("NOT_FOUND", "That payout address was not found.");
  if (row.status !== "pending") {
    throw new AppError("CONFLICT", "Only a pending address can be reviewed.");
  }
  if (row.userId === input.adminId) {
    throw new AppError("FORBIDDEN", "You cannot verify or reject your own wallet address.");
  }
  if (input.approve) {
    await tx.query(
      `update ambassador_wallet_addresses set status='rejected',
              rejection_reason='Replaced by a verified address.', updated_at=now()
        where user_id=$1 and id<>$2 and status in ('pending','verified')`,
      [row.userId, input.addressId],
    );
    await tx.query(
      `update ambassador_wallet_addresses
          set status='verified', verified_by=$2, verified_at=now(),
              rejection_reason=null, updated_at=now()
        where id=$1`,
      [input.addressId, input.adminId],
    );
  } else {
    await tx.query(
      `update ambassador_wallet_addresses
          set status='rejected', rejection_reason=$2, verified_by=$3,
              verified_at=now(), updated_at=now()
        where id=$1`,
      [input.addressId, input.reason?.trim() || "Address could not be verified.", input.adminId],
    );
  }
  await writeAuditLog(tx, {
    actorUserId: input.adminId,
    actorRole: input.adminRole,
    action: input.approve ? "ambassador.address_verified" : "ambassador.address_rejected",
    entityType: "ambassador_wallet_address",
    entityId: input.addressId,
    metadata: { userId: row.userId, address: row.address },
  });
}

/** Small read model for the persistent dashboard campaign. */
export async function getAmbassadorCampaign(userId: string) {
  const db = await getDb();
  const config = await getAmbassadorConfig();
  const result = await db.query<{
    isAmbassador: boolean;
    qualified: number;
    available: unknown;
  }>(
    `select
       exists(select 1 from ambassador_profiles where user_id=$1) as "isAmbassador",
       (select count(*)::int from referrals
         where referrer_id=$1 and ambassador_qualified_at is not null) as qualified,
       coalesce((select sum(amount_usd_cents) from ambassador_ledger where user_id=$1),0)::int as available`,
    [userId],
  );
  return {
    config,
    isAmbassador: Boolean(result.rows[0]?.isAmbassador),
    qualified: Number(result.rows[0]?.qualified ?? 0),
    availableCents: Number(result.rows[0]?.available ?? 0),
  };
}
