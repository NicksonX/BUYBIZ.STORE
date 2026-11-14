import "server-only";
import { getDb } from "@/lib/db";
import type { SqlTransaction } from "@/lib/db/driver";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

export type Campaign = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "draft" | "published" | "paused";
  customerRewardCents: number;
  referrerRewardCents: number;
  qualifyingDepositMinor: number;
  eligibleProductSlugs: string[];
  startsAt: Date;
  endsAt: Date;
  payoutAt: Date;
  timezone: string;
  terms: string;
  publishedAt: Date | null;
};

export type CampaignPhase = "draft" | "upcoming" | "active" | "ended" | "paused";

const CAMPAIGN_SELECT = `
  id, slug, name, description, status,
  customer_reward_usd_cents as "customerRewardCents",
  referrer_reward_usd_cents as "referrerRewardCents",
  qualifying_deposit_minor::bigint as "qualifyingDepositMinor",
  eligible_product_slugs as "eligibleProductSlugs",
  starts_at as "startsAt", ends_at as "endsAt", payout_at as "payoutAt",
  timezone, terms, published_at as "publishedAt"
`;

function normalizeCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description ?? ""),
    status: row.status as Campaign["status"],
    customerRewardCents: Number(row.customerRewardCents),
    referrerRewardCents: Number(row.referrerRewardCents),
    qualifyingDepositMinor: Number(row.qualifyingDepositMinor),
    eligibleProductSlugs: Array.isArray(row.eligibleProductSlugs)
      ? row.eligibleProductSlugs.map(String)
      : [],
    startsAt: new Date(row.startsAt as string | Date),
    endsAt: new Date(row.endsAt as string | Date),
    payoutAt: new Date(row.payoutAt as string | Date),
    timezone: String(row.timezone ?? "Africa/Lagos"),
    terms: String(row.terms ?? ""),
    publishedAt: row.publishedAt ? new Date(row.publishedAt as string | Date) : null,
  };
}

export function campaignPhase(campaign: Campaign, now = new Date()): CampaignPhase {
  if (campaign.status === "draft") return "draft";
  if (campaign.status === "paused") return "paused";
  if (now < campaign.startsAt) return "upcoming";
  if (now > campaign.endsAt) return "ended";
  return "active";
}

export async function getFeaturedCampaign(tx?: SqlTransaction) {
  const db = tx ?? (await getDb());
  const result = await db.query<Record<string, unknown>>(
    `select ${CAMPAIGN_SELECT}
       from campaigns
      where status = 'published'
      order by
        case when now() between starts_at and ends_at then 0
             when now() < starts_at then 1 else 2 end,
        starts_at asc
      limit 1`,
  );
  return result.rows[0] ? normalizeCampaign(result.rows[0]) : null;
}

export async function getCampaignsForAdmin() {
  const db = await getDb();
  const result = await db.query<Record<string, unknown>>(
    `select ${CAMPAIGN_SELECT} from campaigns order by created_at desc`,
  );
  return result.rows.map(normalizeCampaign);
}

export async function getCampaignBySlug(slug: string, includeUnpublished = false) {
  const db = await getDb();
  const result = await db.query<Record<string, unknown>>(
    `select ${CAMPAIGN_SELECT} from campaigns
      where slug = $1 and (status = 'published' or $2 = true)
      limit 1`,
    [slug, includeUnpublished],
  );
  return result.rows[0] ? normalizeCampaign(result.rows[0]) : null;
}

function inWindow(value: Date | string | null, campaign: Campaign) {
  if (!value) return false;
  const date = new Date(value);
  return date >= campaign.startsAt && date <= campaign.endsAt;
}

function normaliseSlugs(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Evaluate every published campaign for one customer after a verified deposit
 * or completed purchase. Safe to call more than once: the database unique keys
 * and idempotency keys are the final duplicate guard.
 */
export async function evaluateCampaignRewards(
  tx: SqlTransaction,
  input: { customerId: string },
) {
  const campaignsResult = await tx.query<Record<string, unknown>>(
    `select ${CAMPAIGN_SELECT} from campaigns
      where status = 'published'
        and now() >= starts_at
        and now() <= ends_at
      order by starts_at asc`,
  );
  const campaigns = campaignsResult.rows.map(normalizeCampaign);
  if (campaigns.length === 0) return [];

  const customer = await tx.query<{
    id: string;
    username: string;
    displayName: string | null;
    createdAt: Date;
  }>(
    `select id, username, coalesce(display_name, username) as "displayName",
            created_at as "createdAt"
       from profiles where id = $1 and status = 'active' limit 1`,
    [input.customerId],
  );
  const person = customer.rows[0];
  if (!person) return [];

  const referralResult = await tx.query<{
    id: string;
    referrerId: string;
    referrerName: string;
    referrerEmail: string;
    createdAt: Date;
  }>(
    `select r.id, r.referrer_id as "referrerId",
            coalesce(p.display_name, p.username) as "referrerName",
            p.email as "referrerEmail", r.created_at as "createdAt"
       from referrals r
       join profiles p on p.id = r.referrer_id
      where r.referee_id = $1
        and r.status <> 'rejected'
        and p.status = 'active'
      limit 1`,
    [input.customerId],
  );
  const referral = referralResult.rows[0] ?? null;

  const awards: Array<{ campaignId: string; role: string; rewardId: string; amountCents: number }> = [];

  for (const campaign of campaigns) {
    // The customer must have registered during the campaign. A customer without
    // a valid referrer can still receive the customer-side reward.
    if (!inWindow(person.createdAt, campaign)) continue;
    if (referral && !inWindow(referral.createdAt, campaign)) continue;
    if (referral && referral.referrerId === input.customerId) continue;

    const deposit = await tx.query<{ id: string }>(
      `select id from deposits
        where user_id = $1 and provider = 'paystack' and status = 'credited'
          and amount_minor >= $2
          and credited_at between $3 and $4
        order by credited_at asc limit 1`,
      [input.customerId, campaign.qualifyingDepositMinor, campaign.startsAt, campaign.endsAt],
    );
    const qualifyingDeposit = deposit.rows[0];
    if (!qualifyingDeposit) continue;

    const eligible = normaliseSlugs(campaign.eligibleProductSlugs);
    const order = await tx.query<{ id: string }>(
      `select o.id
         from orders o join products p on p.id = o.product_id
        where o.user_id = $1 and o.status = 'completed'
          and o.completed_at between $2 and $3
          and (
            ($4::int = 0 and p.category = 'proxy')
            or p.slug = any($5::text[])
          )
        order by o.completed_at asc limit 1`,
      [input.customerId, campaign.startsAt, campaign.endsAt, eligible.length, eligible],
    );
    const qualifyingOrder = order.rows[0];
    if (!qualifyingOrder) continue;

    const customerReward = await insertReward(tx, {
      campaign,
      customerId: input.customerId,
      referrerId: referral?.referrerId ?? null,
      beneficiaryId: input.customerId,
      role: "customer",
      amountCents: campaign.customerRewardCents,
      depositId: qualifyingDeposit.id,
      orderId: qualifyingOrder.id,
      referralId: referral?.id ?? null,
      idempotencyKey: `campaign:${campaign.id}:customer:${input.customerId}`,
    });
    if (customerReward) {
      awards.push({ campaignId: campaign.id, role: "customer", rewardId: customerReward, amountCents: campaign.customerRewardCents });
      await notifyUser(tx, {
        userId: input.customerId,
        type: "system",
        title: "You earned a $10 campaign reward",
        body: `Your qualifying deposit and purchase earned ${usd(campaign.customerRewardCents)} in USD rewards. It becomes available for payout on ${formatCampaignDate(campaign.payoutAt)}.`,
        href: "/dashboard/referrals?tab=rewards",
      });
    }

    if (referral && campaign.referrerRewardCents > 0) {
      const referrerReward = await insertReward(tx, {
        campaign,
        customerId: input.customerId,
        referrerId: referral.referrerId,
        beneficiaryId: referral.referrerId,
        role: "referrer",
        amountCents: campaign.referrerRewardCents,
        depositId: qualifyingDeposit.id,
        orderId: qualifyingOrder.id,
        referralId: referral.id,
        idempotencyKey: `campaign:${campaign.id}:referrer:${input.customerId}`,
      });
      if (referrerReward) {
        awards.push({ campaignId: campaign.id, role: "referrer", rewardId: referrerReward, amountCents: campaign.referrerRewardCents });
        await notifyUser(tx, {
          userId: referral.referrerId,
          type: "system",
          title: "Your referral earned a $10 campaign reward",
          body: `${person.displayName ?? person.username} completed both qualifying steps. ${usd(campaign.referrerRewardCents)} was added to your USD rewards.`,
          href: "/dashboard/referrals?tab=rewards",
        });
      }
    }

    if (customerReward || awards.some((award) => award.campaignId === campaign.id)) {
      await writeAuditLog(tx, {
        actorUserId: null,
        actorRole: "system",
        action: "campaign.reward_evaluated",
        entityType: "campaign",
        entityId: campaign.id,
        metadata: {
          customerId: input.customerId,
          referralId: referral?.id ?? null,
          depositId: qualifyingDeposit.id,
          orderId: qualifyingOrder.id,
          customerRewardCents: customerReward ? campaign.customerRewardCents : 0,
          referrerRewardCents: awards.some((award) => award.campaignId === campaign.id && award.role === "referrer")
            ? campaign.referrerRewardCents
            : 0,
        },
      });
    }
  }
  return awards;
}

async function insertReward(
  tx: SqlTransaction,
  input: {
    campaign: Campaign;
    customerId: string;
    referrerId: string | null;
    beneficiaryId: string;
    role: "customer" | "referrer";
    amountCents: number;
    depositId: string;
    orderId: string;
    referralId: string | null;
    idempotencyKey: string;
  },
) {
  const result = await tx.query<{ id: string }>(
    `insert into campaign_rewards
       (campaign_id, customer_id, referrer_id, beneficiary_id, role,
        amount_usd_cents, status, qualifying_deposit_id, qualifying_order_id,
        referral_id, available_at, idempotency_key)
     values ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)
     on conflict (idempotency_key) do nothing
     returning id`,
    [
      input.campaign.id,
      input.customerId,
      input.referrerId,
      input.beneficiaryId,
      input.role,
      input.amountCents,
      input.depositId,
      input.orderId,
      input.referralId,
      input.campaign.payoutAt,
      input.idempotencyKey,
    ],
  );
  return result.rows[0]?.id ?? null;
}

export type CampaignRewardRow = {
  id: string;
  campaignId: string;
  campaignName: string;
  campaignSlug: string;
  role: "customer" | "referrer";
  amountCents: number;
  status: string;
  availableAt: Date;
  earnedAt: Date;
  paidAt: Date | null;
  customerUsername: string;
  referrerUsername: string | null;
  rejectionReason: string | null;
};

export async function getUsdRewardsDashboard(userId: string) {
  const db = await getDb();
  const [campaignRows, campaignTotals, ambassadorTotals, ambassadorCommissions, payouts, address, ambassadorSchedule] = await Promise.all([
    db.query<CampaignRewardRow>(
      `select cr.id, cr.campaign_id as "campaignId", c.name as "campaignName",
              c.slug as "campaignSlug", cr.role,
              cr.amount_usd_cents as "amountCents", cr.status,
              cr.available_at as "availableAt", cr.earned_at as "earnedAt",
              cr.paid_at as "paidAt",
              customer.username as "customerUsername",
              referrer.username as "referrerUsername",
              cr.rejection_reason as "rejectionReason"
         from campaign_rewards cr
         join campaigns c on c.id = cr.campaign_id
         join profiles customer on customer.id = cr.customer_id
         left join profiles referrer on referrer.id = cr.referrer_id
        where cr.beneficiary_id = $1 and cr.status <> 'void'
        order by cr.earned_at desc limit 100`,
      [userId],
    ),
    db.query<{
      earned: unknown;
      available: unknown;
      pending: unknown;
      paid: unknown;
    }>(
      `select
         coalesce(sum(amount_usd_cents) filter (where status not in ('rejected','void')),0)::int as earned,
         coalesce(sum(amount_usd_cents) filter (
           where status = 'available' or (status = 'pending' and available_at <= now())
         ),0)::int as available,
         coalesce(sum(amount_usd_cents) filter (
           where status = 'reserved' or (status = 'pending' and available_at > now())
         ),0)::int as pending,
         coalesce(sum(amount_usd_cents) filter (where status = 'paid'),0)::int as paid
       from campaign_rewards where beneficiary_id = $1`,
      [userId],
    ),
    db.query<{
      earned: unknown;
      available: unknown;
      pending: unknown;
      paid: unknown;
    }>(
      `select
         coalesce((select sum(amount_usd_cents) from ambassador_ledger
                    where user_id=$1 and entry_type='commission'),0)::int as earned,
         coalesce((select sum(amount_usd_cents) from ambassador_ledger where user_id=$1),0)::int as available,
         coalesce((select sum(amount_usd_cents) from ambassador_withdrawals
                    where user_id=$1 and status in ('pending','processing')),0)::int as pending,
         coalesce((select sum(amount_usd_cents) from ambassador_withdrawals
                    where user_id=$1 and status='paid'),0)::int as paid`,
      [userId],
    ),
    db.query<{
      id: string;
      amountCents: number;
      status: string;
      createdAt: Date;
      referralUsername: string;
    }>(
      `select c.id, c.amount_usd_cents as "amountCents", c.status,
              c.created_at as "createdAt", p.username as "referralUsername"
         from ambassador_commissions c
         join referrals r on r.id = c.referral_id
         join profiles p on p.id = r.referee_id
        where c.ambassador_id = $1 and c.status = 'available'
        order by c.created_at desc limit 30`,
      [userId],
    ),
    db.query<{
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
         from reward_payouts where user_id=$1 order by requested_at desc limit 50`,
      [userId],
    ),
    db.query<{
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
    ),
    db.query<{ value: unknown }>(
      `select value from app_settings where key='ambassador_next_payout_at' limit 1`,
    ),
  ]);

  const campaign = campaignTotals.rows[0];
  const ambassador = ambassadorTotals.rows[0];
  const campaignAvailable = Number(campaign?.available ?? 0);
  const campaignPending = Number(campaign?.pending ?? 0);
  const ambassadorAvailable = Math.max(0, Number(ambassador?.available ?? 0));
  const ambassadorPending = Number(ambassador?.pending ?? 0);
  const campaignEarned = Number(campaign?.earned ?? 0);
  const ambassadorEarned = Number(ambassador?.earned ?? 0);

  return {
    totals: {
      earnedCents: campaignEarned + ambassadorEarned,
      availableCents: campaignAvailable + ambassadorAvailable,
      pendingCents: campaignPending + ambassadorPending,
      paidCents: Number(campaign?.paid ?? 0) + Number(ambassador?.paid ?? 0),
    },
    campaign: {
      earnedCents: campaignEarned,
      availableCents: campaignAvailable,
      pendingCents: campaignPending,
      paidCents: Number(campaign?.paid ?? 0),
    },
    ambassador: {
      earnedCents: ambassadorEarned,
      availableCents: ambassadorAvailable,
      pendingCents: ambassadorPending,
      paidCents: Number(ambassador?.paid ?? 0),
    },
    campaignRewards: campaignRows.rows,
    ambassadorCommissions: ambassadorCommissions.rows,
    payouts: payouts.rows,
    address: address.rows[0] ?? null,
    campaignPayoutAt: campaignRows.rows[0]?.availableAt ?? null,
    ambassadorNextPayoutAt: (() => {
      const raw = ambassadorSchedule.rows[0]?.value;
      if (typeof raw !== "string" || !raw.trim()) return null;
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    })(),
  };
}

export async function requestCampaignPayout(userId: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const open = await tx.query(
      `select 1 from reward_payouts
        where user_id=$1 and status in ('pending_review','approved','processing') limit 1`,
      [userId],
    );
    if (open.rows[0]) {
      throw new AppError("CONFLICT", "You already have a USD payout in progress.");
    }
    const address = await tx.query<{ address: string }>(
      `select address from ambassador_wallet_addresses
        where user_id=$1 and status='verified'
        order by verified_at desc nulls last limit 1`,
      [userId],
    );
    if (!address.rows[0]) {
      throw new AppError("VALIDATION", "Add and verify a USDT BEP20 address before requesting a payout.");
    }
    const rewards = await tx.query<{ id: string; amountCents: number }>(
      `select id, amount_usd_cents as "amountCents"
         from campaign_rewards
        where beneficiary_id=$1
          and ((status='available') or (status='pending' and available_at <= now()))
        order by earned_at asc
        for update`,
      [userId],
    );
    if (rewards.rows.length === 0) {
      throw new AppError("INSUFFICIENT_BALANCE", "No USD campaign rewards are available for payout yet.");
    }
    const amountCents = rewards.rows.reduce((sum, row) => sum + Number(row.amountCents), 0);
    const inserted = await tx.query<{ id: string }>(
      `insert into reward_payouts
         (user_id, amount_usd_cents, status, wallet_address, network, requested_at)
       values ($1,$2,'pending_review',$3,'BEP20',now()) returning id`,
      [userId, amountCents, address.rows[0].address],
    );
    const payoutId = inserted.rows[0].id;
    for (const reward of rewards.rows) {
      await tx.query(
        `insert into reward_payout_items (payout_id, reward_id, amount_usd_cents)
         values ($1,$2,$3)`,
        [payoutId, reward.id, reward.amountCents],
      );
      await tx.query(
        `update campaign_rewards
            set status='reserved', updated_at=now()
          where id=$1 and status in ('available','pending')`,
        [reward.id],
      );
    }
    await notifyUser(tx, {
      userId,
      type: "system",
      title: "USD reward payout requested",
      body: `${usd(amountCents)} is pending review. BUYBIZ will send USDT on BEP20 after manual approval.`,
      href: "/dashboard/referrals?tab=rewards",
    });
    await writeAuditLog(tx, {
      actorUserId: userId,
      actorRole: "customer",
      action: "campaign.payout_requested",
      entityType: "reward_payout",
      entityId: payoutId,
      metadata: { amountCents, address: address.rows[0].address, rewardIds: rewards.rows.map((row) => row.id) },
    });
    return { id: payoutId, amountCents };
  });
}

export async function updateCampaign(
  input: {
    actorId: string;
    actorRole: string;
    id?: string;
    slug: string;
    name: string;
    description: string;
    status: "draft" | "published" | "paused";
    customerRewardUsd: number;
    referrerRewardUsd: number;
    qualifyingDepositNgn: number;
    eligibleProductSlugs: string[];
    startsAt: string;
    endsAt: string;
    payoutAt: string;
    terms: string;
  },
) {
  if (input.customerRewardUsd <= 0 || input.referrerRewardUsd < 0) {
    throw new AppError("VALIDATION", "Campaign rewards must be positive USD amounts.");
  }
  if (!input.name.trim() || !input.slug?.trim()) {
    throw new AppError("VALIDATION", "Campaign name and slug are required.");
  }
  const date = (value: string) => {
    const parsed = new Date(`${value}T00:00:00+01:00`);
    if (Number.isNaN(parsed.getTime())) throw new AppError("VALIDATION", "Choose valid campaign dates.");
    return parsed;
  };
  const startsAt = date(input.startsAt);
  const endsAt = new Date(`${input.endsAt}T23:59:59+01:00`);
  const payoutAt = date(input.payoutAt);
  if (endsAt <= startsAt) throw new AppError("VALIDATION", "The campaign end date must be after the start date.");
  if (payoutAt < endsAt) throw new AppError("VALIDATION", "The payout date must be on or after the campaign end date.");
  const db = await getDb();
  return db.transaction(async (tx) => {
    const id = input.id ?? crypto.randomUUID();
    await tx.query(
      `insert into campaigns
         (id, slug, name, description, status, customer_reward_usd_cents,
          referrer_reward_usd_cents, qualifying_deposit_minor, eligible_product_slugs,
          starts_at, ends_at, payout_at, timezone, terms, created_by, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,'Africa/Lagos',$13,$14,$15)
       on conflict (id) do update set
         slug=excluded.slug, name=excluded.name, description=excluded.description,
         status=excluded.status, customer_reward_usd_cents=excluded.customer_reward_usd_cents,
         referrer_reward_usd_cents=excluded.referrer_reward_usd_cents,
         qualifying_deposit_minor=excluded.qualifying_deposit_minor,
         eligible_product_slugs=excluded.eligible_product_slugs,
         starts_at=excluded.starts_at, ends_at=excluded.ends_at, payout_at=excluded.payout_at,
         terms=excluded.terms,
         published_at=case when excluded.status='published' then coalesce(campaigns.published_at, now()) else campaigns.published_at end,
         updated_at=now()`,
      [
        id,
        input.slug.trim().toLowerCase(),
        input.name.trim(),
        input.description.trim(),
        input.status,
        Math.round(input.customerRewardUsd * 100),
        Math.round(input.referrerRewardUsd * 100),
        Math.round(input.qualifyingDepositNgn * 100),
        JSON.stringify(input.eligibleProductSlugs),
        startsAt,
        endsAt,
        payoutAt,
        input.terms.trim(),
        input.actorId,
        input.status === "published" ? new Date() : null,
      ],
    );
    await writeAuditLog(tx, {
      actorUserId: input.actorId,
      actorRole: input.actorRole,
      action: "campaign.saved",
      entityType: "campaign",
      entityId: id,
      metadata: { slug: input.slug, status: input.status },
    });
    return id;
  });
}

export async function reviewCampaignPayout(input: {
  actorId: string;
  actorRole: string;
  payoutId: string;
  decision: "approve" | "processing" | "paid" | "reject";
  transactionHash?: string;
  reason?: string;
}) {
  if (input.decision === "paid" && !/^0x[0-9a-fA-F]{64}$/.test(input.transactionHash ?? "")) {
    throw new AppError("VALIDATION", "Enter the 0x transaction hash from the completed BEP20 transfer.");
  }
  if (input.decision === "reject" && !input.reason?.trim()) {
    throw new AppError("VALIDATION", "Add a rejection reason.");
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    const payout = await tx.query<{
      id: string; userId: string; amountCents: number; status: string;
    }>(
      `select id, user_id as "userId", amount_usd_cents as "amountCents", status
         from reward_payouts where id=$1 for update`,
      [input.payoutId],
    );
    const row = payout.rows[0];
    if (!row) throw new AppError("NOT_FOUND", "Payout request not found.");
    if (row.status === "paid" || row.status === "rejected") {
      throw new AppError("CONFLICT", "This payout is already closed.");
    }
    if (input.decision === "approve" && row.status !== "pending_review") {
      throw new AppError("CONFLICT", "Only a pending review payout can be approved.");
    }
    if (input.decision === "processing" && row.status !== "approved") {
      throw new AppError("CONFLICT", "Approve the payout before marking it processing.");
    }
    if (input.decision === "paid" && !["approved", "processing"].includes(row.status)) {
      throw new AppError("CONFLICT", "Approve the payout before marking it paid.");
    }
    if (input.decision === "reject") {
      await tx.query(
        `update campaign_rewards set status='available', rejection_reason=$2, updated_at=now()
          where id in (select reward_id from reward_payout_items where payout_id=$1)`,
        [row.id, input.reason?.trim() ?? null],
      );
      await tx.query(
        `update reward_payouts set status='rejected', rejection_reason=$2,
                reviewed_by=$3, reviewed_at=now(), updated_at=now()
          where id=$1`,
        [row.id, input.reason?.trim() ?? null, input.actorId],
      );
    } else if (input.decision === "paid") {
      await tx.query(
        `update campaign_rewards set status='paid', paid_at=now(), updated_at=now()
          where id in (select reward_id from reward_payout_items where payout_id=$1)`,
        [row.id],
      );
      await tx.query(
        `update reward_payouts set status='paid', transaction_hash=$2,
                reviewed_by=$3, reviewed_at=coalesce(reviewed_at,now()), paid_at=now(), updated_at=now()
          where id=$1`,
        [row.id, input.transactionHash ?? null, input.actorId],
      );
    } else {
      await tx.query(
        `update reward_payouts set status=$2, reviewed_by=$3, reviewed_at=now(), updated_at=now()
          where id=$1`,
        [row.id, input.decision === "approve" ? "approved" : "processing", input.actorId],
      );
    }
    await notifyUser(tx, {
      userId: row.userId,
      type: "system",
      title:
        input.decision === "paid" ? "USD reward payout sent" :
        input.decision === "reject" ? "USD reward payout needs attention" :
        input.decision === "approve" ? "USD reward payout approved" :
        "USD reward payout processing",
      body:
        input.decision === "paid"
          ? `Your ${usd(row.amountCents)} USDT BEP20 payout was marked paid. The transaction hash is available in Rewards.`
          : input.decision === "reject"
            ? `Your ${usd(row.amountCents)} payout was rejected: ${input.reason}`
            : `Your ${usd(row.amountCents)} payout is being processed manually.`,
      href: "/dashboard/referrals?tab=rewards",
    });
    await writeAuditLog(tx, {
      actorUserId: input.actorId,
      actorRole: input.actorRole,
      action: `campaign.payout_${input.decision}`,
      entityType: "reward_payout",
      entityId: row.id,
      metadata: { amountCents: row.amountCents, transactionHash: input.transactionHash ?? null, reason: input.reason ?? null },
    });
    return row;
  });
}

export async function getCampaignAdminData() {
  const db = await getDb();
  const [campaigns, rewards, payouts, totals] = await Promise.all([
    db.query<Record<string, unknown>>(
      `select ${CAMPAIGN_SELECT} from campaigns order by created_at desc`,
    ),
    db.query<{
      id: string; campaignName: string; customerUsername: string; referrerUsername: string | null;
      role: string; amountCents: number; status: string; earnedAt: Date;
      depositId: string; orderId: string;
    }>(
      `select cr.id, c.name as "campaignName", customer.username as "customerUsername",
              referrer.username as "referrerUsername", cr.role,
              cr.amount_usd_cents as "amountCents", cr.status, cr.earned_at as "earnedAt",
              cr.qualifying_deposit_id as "depositId", cr.qualifying_order_id as "orderId"
         from campaign_rewards cr
         join campaigns c on c.id=cr.campaign_id
         join profiles customer on customer.id=cr.customer_id
         left join profiles referrer on referrer.id=cr.referrer_id
        order by cr.earned_at desc limit 200`,
    ),
    db.query<{
      id: string; username: string; email: string; amountCents: number; status: string;
      walletAddress: string; transactionHash: string | null; requestedAt: Date;
      rejectionReason: string | null;
    }>(
      `select p.id, u.username, u.email, p.amount_usd_cents as "amountCents", p.status,
              p.wallet_address as "walletAddress", p.transaction_hash as "transactionHash",
              p.requested_at as "requestedAt", p.rejection_reason as "rejectionReason"
         from reward_payouts p join profiles u on u.id=p.user_id
        order by p.requested_at desc limit 200`,
    ),
    db.query<{ total: unknown; customer: unknown; referrer: unknown; paid: unknown; pending: unknown }>(
      `select
         coalesce(sum(amount_usd_cents),0)::int as total,
         coalesce(sum(amount_usd_cents) filter (where role='customer'),0)::int as customer,
         coalesce(sum(amount_usd_cents) filter (where role='referrer'),0)::int as referrer,
         coalesce(sum(amount_usd_cents) filter (where status='paid'),0)::int as paid,
         coalesce(sum(amount_usd_cents) filter (where status in ('pending','available','reserved')),0)::int as pending
       from campaign_rewards where status <> 'void'`,
    ),
  ]);
  return {
    campaigns: campaigns.rows.map(normalizeCampaign),
    rewards: rewards.rows,
    payouts: payouts.rows,
    totals: {
      totalCents: Number(totals.rows[0]?.total ?? 0),
      customerCents: Number(totals.rows[0]?.customer ?? 0),
      referrerCents: Number(totals.rows[0]?.referrer ?? 0),
      paidCents: Number(totals.rows[0]?.paid ?? 0),
      pendingCents: Number(totals.rows[0]?.pending ?? 0),
    },
  };
}

export function usd(cents: number) {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

export function formatCampaignDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos",
  }).format(date);
}
