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

/**
 * Called only from verified external deposit crediting. Internal transfers,
 * refunds, admin credits and adjustments never pass through this function.
 * The reward is internal BUYBIZ credit, not a cash payout.
 */
export async function qualifyReferralForDeposit(
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

  const settings = await tx.query<{
    enabled: unknown;
    minimum: unknown;
    reward: unknown;
  }>(
    `select
       (select value from app_settings where key = 'referral_enabled') as enabled,
       (select value from app_settings where key = 'referral_qualifying_deposit_minor') as minimum,
       (select value from app_settings where key = 'referral_reward_minor') as reward`,
  );
  const row = settings.rows[0];
  if (!row || row.enabled !== true) return null;
  const minimum = Number(row.minimum ?? 300_000);
  const reward = Number(row.reward ?? 100_000);
  if (deposit.amountMinor < minimum) return null;

  const pending = await tx.query<ReferralRow>(
    `select id, referrer_id as "referrerId", referee_id as "refereeId", status
       from referrals
      where referee_id = $1 and status = 'pending'
      limit 1 for update`,
    [deposit.userId],
  );
  const referral = pending.rows[0];
  if (!referral) return null;

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

  const updated = await tx.query<{ id: string }>(
    `update referrals
        set status = 'rewarded',
            qualifying_deposit_id = $2,
            reward_amount_minor = $3,
            rewarded_at = now(),
            updated_at = now()
      where id = $1 and status = 'pending'
      returning id`,
    [referral.id, deposit.id, reward],
  );
  if (!updated.rows[0]) return null;

  await tx.query(
    `insert into wallet_ledger
       (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor,
        currency, reference, related_deposit_id, description)
     values ($1,$2,'referral_credit',$3,$4,'NGN',$5,$6,$7)`,
    [
      wallet.rows[0].id,
      referral.referrerId,
      reward,
      balance + reward,
      `referral:${referral.id}`,
      deposit.id,
      "Referral reward (internal wallet credit)",
    ],
  );

  const amountLabel = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(reward / 100);
  await notifyUser(tx, {
    userId: referral.referrerId,
    type: "system",
    title: "Referral reward credited",
    body: `A friend made a qualifying deposit. ${amountLabel} was added to your BUYBIZ wallet.`,
    href: "/dashboard/referrals",
  });
  const referee = await tx.query<{ username: string }>(
    `select username from profiles where id=$1 limit 1`,
    [referral.refereeId],
  );
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
      }).format((balance + reward) / 100),
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
      depositId: deposit.id,
      rewardMinor: reward,
    },
  });

  return { referralId: referral.id, rewardMinor: reward };
}
