import "server-only";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { queueEmail } from "@/server/services/email";

type ReferralRow = {
  id: string;
  referrerId: string;
  refereeId: string;
  status: string;
};

export async function validateReferralCode(
  rawCode: string | null | undefined,
  refereeEmail?: string,
) {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return { valid: true as const, code: "", referrerId: null };
  const db = await getDb();
  const result = await db.query<{
    id: string;
    email: string;
    status: string;
  }>(
    `select id, email, status from profiles
      where upper(referral_code) = $1 limit 1`,
    [code],
  );
  const referrer = result.rows[0];
  if (!referrer || referrer.status !== "active") {
    return { valid: false as const, code, referrerId: null };
  }
  if (refereeEmail && referrer.email.toLowerCase() === refereeEmail.toLowerCase()) {
    return { valid: false as const, code, referrerId: null };
  }
  return { valid: true as const, code, referrerId: referrer.id };
}

export async function attachReferralForSignup(
  tx: SqlTransaction,
  refereeId: string,
  rawCode: string | null | undefined,
) {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return null;

  const referrer = await tx.query<{ id: string }>(
    `select id from profiles where upper(referral_code) = $1 limit 1`,
    [code],
  );
  const referrerId = referrer.rows[0]?.id;
  if (!referrerId || referrerId === refereeId) return null;

  const inserted = await tx.query<{ id: string }>(
    `insert into referrals (referrer_id, referee_id, referral_code)
     values ($1,$2,$3)
     on conflict (referee_id) do nothing
     returning id`,
    [referrerId, refereeId, code],
  );
  const referralId = inserted.rows[0]?.id;
  if (!referralId) return null;

  const people = await tx.query<{
    referrerEmail: string;
    referrerName: string;
    refereeName: string;
  }>(
    `select referrer.email as "referrerEmail",
            coalesce(referrer.display_name, referrer.username) as "referrerName",
            referee.username as "refereeName"
       from profiles referrer, profiles referee
      where referrer.id=$1 and referee.id=$2`,
    [referrerId, refereeId],
  );
  const person = people.rows[0];
  if (person) {
    await queueEmail(tx, {
      type: "referral_joined",
      userId: referrerId,
      recipient: person.referrerEmail,
      data: {
        name: person.referrerName,
        referralName: person.refereeName,
      },
      dedupeKey: `referral_joined:${referralId}`,
    });
  }
  return referralId;
}

type ReferralSettings = {
  enabled: boolean;
  minimumDepositMinor: number;
  rewardMinor: number;
  minDurationSeconds: number;
  minDurationDays: number;
};

async function referralSettings(tx: SqlTransaction): Promise<ReferralSettings> {
  const result = await tx.query<{
    enabled: unknown;
    minimum: unknown;
    reward: unknown;
    duration: unknown;
  }>(
    `select
       (select value from app_settings where key = 'referral_enabled') as enabled,
       (select value from app_settings where key = 'referral_qualifying_deposit_minor') as minimum,
       (select value from app_settings where key = 'referral_reward_minor') as reward,
       (select value from app_settings where key = 'referral_qualifying_proxy_duration_seconds') as duration`,
  );
  const row = result.rows[0];
  const minDurationSeconds = Math.max(86_400, Number(row?.duration ?? 604_800));
  return {
    enabled: row?.enabled === true,
    minimumDepositMinor: Number(row?.minimum ?? 200_000),
    rewardMinor: Number(row?.reward ?? 100_000),
    minDurationSeconds,
    minDurationDays: Math.ceil(minDurationSeconds / 86_400),
  };
}

function naira(minor: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(minor / 100);
}

/**
 * Records the verified deposit on a pending referral but does not reward it.
 * A referral becomes eligible only after a completed proxy purchase at or above
 * the configured minimum duration. Internal transfers, refunds, admin credits
 * and adjustments never pass through this function.
 */
export async function recordReferralDeposit(
  tx: SqlTransaction,
  deposit: {
    id: string;
    userId: string;
    amountMinor: number;
    provider: string;
    status: string;
  },
) {
  if (deposit.status !== "credited") return null;
  if (deposit.provider !== "paystack" && deposit.provider !== "demo") return null;

  const settings = await referralSettings(tx);
  if (!settings.enabled) return null;
  if (deposit.amountMinor < settings.minimumDepositMinor) return null;

  const pending = await tx.query<ReferralRow & { qualifyingDepositId: string | null }>(
    `select id, referrer_id as "referrerId", referee_id as "refereeId", status,
            qualifying_deposit_id as "qualifyingDepositId"
       from referrals
      where referee_id = $1
        and status in ('registered','pending')
        and rewarded_at is null
      limit 1 for update`,
    [deposit.userId],
  );
  const referral = pending.rows[0];
  if (!referral || referral.qualifyingDepositId) return null;

  const updated = await tx.query<{ id: string }>(
    `update referrals
        set status = 'pending',
            qualifying_deposit_id = $2,
            updated_at = now()
      where id = $1
        and status in ('registered','pending')
        and qualifying_deposit_id is null
      returning id`,
    [referral.id, deposit.id],
  );
  if (!updated.rows[0]) return null;

  await writeAuditLog(tx, {
    actorUserId: null,
    actorRole: "system",
    action: "referral.deposit_recorded",
    entityType: "referral",
    entityId: referral.id,
    metadata: {
      refereeId: referral.refereeId,
      depositId: deposit.id,
      amountMinor: deposit.amountMinor,
      minimumDurationDays: settings.minDurationDays,
    },
  });

  await notifyUser(tx, {
    userId: referral.referrerId,
    type: "system",
    title: "Referral deposit verified",
    body: `Your friend's deposit is verified. A completed proxy purchase of ${settings.minDurationDays} days or more is still required to unlock your ${naira(settings.rewardMinor)} referral reward.`,
    href: "/dashboard/referrals",
  });

  // Edge case: the qualifying purchase completed before the deposit was
  // credited. Finish qualification now instead of waiting for another purchase.
  const existingOrder = await tx.query<{ id: string }>(
    `select o.id
       from orders o join products p on p.id = o.product_id
      where o.user_id = $1 and o.status = 'completed'
        and p.duration_seconds >= $2
      order by o.completed_at asc nulls last, o.created_at asc
      limit 1`,
    [deposit.userId, settings.minDurationSeconds],
  );
  if (existingOrder.rows[0]) {
    await qualifyReferralForPurchase(tx, {
      refereeId: deposit.userId,
      orderId: existingOrder.rows[0].id,
    });
  }

  return { referralId: referral.id, status: "pending" as const };
}

/**
 * Called only after a successful proxy order and allocation. It verifies the
 * actual product duration in the database, requires the earlier verified
 * deposit threshold, and rewards the referrer exactly once.
 */
export async function qualifyReferralForPurchase(
  tx: SqlTransaction,
  input: { refereeId: string; orderId: string },
) {
  const settings = await referralSettings(tx);
  if (!settings.enabled) return null;

  const orderResult = await tx.query<{
    id: string;
    status: string;
    durationSeconds: number;
  }>(
    `select o.id, o.status::text as status, p.duration_seconds as "durationSeconds"
       from orders o join products p on p.id = o.product_id
      where o.id = $1 and o.user_id = $2
      limit 1`,
    [input.orderId, input.refereeId],
  );
  const order = orderResult.rows[0];
  if (!order || order.status !== "completed") return null;
  if (Number(order.durationSeconds) < settings.minDurationSeconds) return null;

  const pending = await tx.query<
    ReferralRow & { qualifyingDepositId: string | null }
  >(
    `select id, referrer_id as "referrerId", referee_id as "refereeId", status,
            qualifying_deposit_id as "qualifyingDepositId"
       from referrals
      where referee_id = $1
        and status in ('registered','pending','qualified')
        and rewarded_at is null
        and qualifying_order_id is null
      limit 1 for update`,
    [input.refereeId],
  );
  const referral = pending.rows[0];
  if (!referral) return null;
  if (!referral.qualifyingDepositId) return null;

  const qualified = await tx.query<{ id: string }>(
    `update referrals
        set status = 'qualified',
            qualifying_order_id = $2,
            qualifying_purchase_at = now(),
            qualifying_duration_seconds = $3,
            updated_at = now()
      where id = $1
        and status in ('registered','pending','qualified')
        and rewarded_at is null
        and qualifying_order_id is null
      returning id`,
    [referral.id, order.id, order.durationSeconds],
  );
  if (!qualified.rows[0]) return null;

  await writeAuditLog(tx, {
    actorUserId: null,
    actorRole: "system",
    action: "referral.qualified",
    entityType: "referral",
    entityId: referral.id,
    metadata: {
      referrerId: referral.referrerId,
      refereeId: referral.refereeId,
      depositId: referral.qualifyingDepositId,
      orderId: order.id,
      durationSeconds: order.durationSeconds,
      minimumDurationDays: settings.minDurationDays,
    },
  });

  await tx.query(
    `insert into wallet_accounts (user_id) values ($1)
     on conflict (user_id) do nothing`,
    [referral.referrerId],
  );
  const wallet = await tx.query<{ id: string; email: string; name: string }>(
    `select w.id, p.email, coalesce(p.display_name,p.username) as name
       from wallet_accounts w join profiles p on p.id=w.user_id
      where w.user_id = $1 for update of w`,
    [referral.referrerId],
  );
  if (!wallet.rows[0]) throw new AppError("UNKNOWN", "Referrer wallet not found.");

  const balanceResult = await tx.query<{ balance: unknown }>(
    `select coalesce(sum(amount_minor),0)::bigint as balance
       from wallet_ledger where wallet_account_id = $1`,
    [wallet.rows[0].id],
  );
  const balance = Number(balanceResult.rows[0]?.balance ?? 0);

  const rewarded = await tx.query<{ id: string }>(
    `update referrals
        set status = 'rewarded',
            reward_amount_minor = $2,
            rewarded_at = now(),
            updated_at = now()
      where id = $1 and status = 'qualified' and rewarded_at is null
      returning id`,
    [referral.id, settings.rewardMinor],
  );
  if (!rewarded.rows[0]) return null;

  await tx.query(
    `insert into wallet_ledger
       (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
        currency, reference, related_deposit_id, related_order_id, description)
     values ($1,$2,'referral_credit',$3,$4,'NGN',$5,$6,$7,$8)`,
    [
      wallet.rows[0].id,
      referral.referrerId,
      settings.rewardMinor,
      balance + settings.rewardMinor,
      `referral:${referral.id}`,
      referral.qualifyingDepositId,
      order.id,
      `Referral reward — qualifying ${Math.round(Number(order.durationSeconds) / 86_400)}-day proxy purchase`,
    ],
  );

  const amountLabel = naira(settings.rewardMinor);
  const referee = await tx.query<{ username: string }>(
    `select username from profiles where id=$1 limit 1`,
    [referral.refereeId],
  );
  await notifyUser(tx, {
    userId: referral.referrerId,
    type: "system",
    title: "Referral reward credited",
    body: `Your friend completed a qualifying proxy purchase. ${amountLabel} was added to your BUYBIZ wallet.`,
    href: "/dashboard/referrals",
  });
  await queueEmail(tx, {
    type: "referral_qualified",
    userId: referral.referrerId,
    recipient: wallet.rows[0].email,
    data: {
      name: wallet.rows[0].name,
      referralName: referee.rows[0]?.username ?? "Your friend",
      amountLabel,
    },
    dedupeKey: `referral_qualified:${referral.id}`,
  });
  await queueEmail(tx, {
    type: "referral_reward",
    userId: referral.referrerId,
    recipient: wallet.rows[0].email,
    data: {
      name: wallet.rows[0].name,
      amountLabel,
      balanceLabel: new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
      }).format((balance + settings.rewardMinor) / 100),
    },
    dedupeKey: `referral_reward:${referral.id}`,
  });

  await writeAuditLog(tx, {
    actorUserId: null,
    actorRole: "system",
    action: "referral.rewarded",
    entityType: "referral",
    entityId: referral.id,
    metadata: {
      referrerId: referral.referrerId,
      refereeId: referral.refereeId,
      depositId: referral.qualifyingDepositId,
      orderId: order.id,
      durationSeconds: order.durationSeconds,
      rewardMinor: settings.rewardMinor,
    },
  });

  return {
    referralId: referral.id,
    rewardMinor: settings.rewardMinor,
    orderId: order.id,
  };
}
