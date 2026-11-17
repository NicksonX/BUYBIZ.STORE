import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { creditDepositFromVerification } from "@/server/services/deposits";
import {
  attachReferralForSignup,
  qualifyReferralForPurchase,
} from "@/server/services/referrals";
import { qualifyReferralForAmbassador } from "@/server/services/ambassador";
import { getReferralDashboard } from "@/server/data/customer";
import { transferWalletFunds } from "@/server/services/transfers";
import { createTestUser, fundWallet } from "../helpers";

beforeAll(async () => {
  await getDb();
});

afterEach(async () => {
  delete process.env.ENABLE_WALLET_TRANSFERS;
  const db = await getDb();
  await db.query(
    `update app_settings set value='false'::jsonb where key='wallet_transfers_enabled'`,
  );
});

async function attach(referrerId: string, refereeId: string, code: string) {
  const db = await getDb();
  await db.transaction((tx) => attachReferralForSignup(tx, refereeId, code));
}

async function deposit(userId: string, amountMinor: number) {
  const db = await getDb();
  const id = randomUUID();
  const reference = `BZ-REFERRAL-${randomUUID()}`;
  await db.query(
    `insert into deposits (id,user_id,provider,provider_reference,amount_minor,currency,status)
     values ($1,$2,'paystack',$3,$4,'NGN','pending')`,
    [id, userId, reference, amountMinor],
  );
  return creditDepositFromVerification({
    depositId: id,
    payload: {
      status: "success",
      reference,
      amount: amountMinor,
      currency: "NGN",
      id: 4444,
      fees: 0,
      channel: "card",
      domain: "test",
    },
  });
}

async function buyProxy(userId: string, days: 1 | 7 | 30, status = "completed") {
  const db = await getDb();
  const slug =
    days === 30 ? "proxy-30-days" : days === 7 ? "proxy-7-days" : "proxy-24-hours";
  const product = await db.query<{ id: string; durationSeconds: number }>(
    `select id, duration_seconds as "durationSeconds" from products where slug=$1 limit 1`,
    [slug],
  );
  const row = product.rows[0];
  if (!row) throw new Error(`Missing product ${slug}`);
  const orderId = randomUUID();
  await db.query(
    `insert into orders (id,order_number,user_id,product_id,amount_minor,currency,status,idempotency_key,created_at,completed_at)
     values ($1,$2,$3,$4,50000,'NGN',$6,$5,now(),now())`,
    [orderId, `BZ-ELIG-${orderId.slice(0, 8)}`, userId, row.id, `elig-${orderId}`, status],
  );
  const result = await db.transaction(async (tx) => {
    const referral = await qualifyReferralForPurchase(tx, { refereeId: userId, orderId });
    if (referral) {
      await qualifyReferralForAmbassador(tx, {
        refereeId: userId,
        eventType: "purchase",
        eventRef: orderId,
        durationSeconds: row.durationSeconds,
      });
    }
    return referral;
  });
  return { orderId, result };
}

async function codeFor(userId: string) {
  const db = await getDb();
  const result = await db.query<{ code: string }>(
    `select referral_code as code from profiles where id=$1`,
    [userId],
  );
  return result.rows[0].code;
}

describe("referral rewards", () => {
  it("credits the normal $3 USD referral reward once after a 7-day purchase", async () => {
    const referrer = await createTestUser("refowner");
    const referee = await createTestUser("refnew");
    await attach(referrer.id, referee.id, await codeFor(referrer.id));

    const low = await deposit(referee.id, 199_999);
    expect(low.status).toBe("credited");

    const db = await getDb();
    const pending = await db.query<{ status: string }>(
      `select status from referrals where referee_id=$1`,
      [referee.id],
    );
    expect(pending.rows[0].status).toBe("registered");
    const referrerBalance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [referrer.id],
    );
    expect(Number(referrerBalance.rows[0].balance)).toBe(0);

    await deposit(referee.id, 200_000);
    const depositedOnly = await db.query<{ status: string; reward: number | null }>(
      `select status, reward_amount_minor::bigint as reward from referrals where referee_id=$1`,
      [referee.id],
    );
    expect(depositedOnly.rows[0].status).toBe("pending");
    expect(depositedOnly.rows[0].reward).toBeNull();

    const short = await buyProxy(referee.id, 1);
    expect(short.result).toBeNull();
    const afterShort = await db.query<{ status: string }>(
      `select status from referrals where referee_id=$1`,
      [referee.id],
    );
    expect(afterShort.rows[0].status).toBe("pending");

    await buyProxy(referee.id, 7);
    const rewarded = await db.query<{ status: string; reward: number }>(
      `select status, reward_amount_minor::bigint as reward from referrals where referee_id=$1`,
      [referee.id],
    );
    expect(rewarded.rows[0].status).toBe("rewarded");
    expect(rewarded.rows[0].reward).toBeNull();

    const usdRewards = await db.query<{ count: number; total: number }>(
      `select count(*)::int as count, coalesce(sum(amount_usd_cents),0)::int as total
         from ambassador_ledger where user_id=$1 and entry_type='commission'`,
      [referrer.id],
    );
    expect(usdRewards.rows[0]).toEqual({ count: 1, total: 300 });
    const walletCredits = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='referral_credit'`,
      [referrer.id],
    );
    expect(walletCredits.rows[0].count).toBe(0);
  });

  it("qualifies on a 7-day purchase without any wallet deposit", async () => {
    const referrer = await createTestUser("refnodep");
    const referee = await createTestUser("refnodepnew");
    await attach(referrer.id, referee.id, await codeFor(referrer.id));
    await buyProxy(referee.id, 7);
    const db = await getDb();
    const row = await db.query<{ status: string }>(`select status from referrals where referee_id=$1`, [referee.id]);
    expect(row.rows[0].status).toBe("rewarded");
  });

  it("qualifies a 30-day purchase and rejects a refunded 7-day order", async () => {
    const referrer = await createTestUser("ref30");
    const thirty = await createTestUser("ref30new");
    await attach(referrer.id, thirty.id, await codeFor(referrer.id));
    await deposit(thirty.id, 200_000);
    await buyProxy(thirty.id, 30);
    const db = await getDb();
    const thirtyStatus = await db.query<{ status: string }>(
      `select status from referrals where referee_id=$1`,
      [thirty.id],
    );
    expect(thirtyStatus.rows[0].status).toBe("rewarded");

    const refundReferrer = await createTestUser("refrefund");
    const refunded = await createTestUser("refrefundnew");
    await attach(refundReferrer.id, refunded.id, await codeFor(refundReferrer.id));
    await deposit(refunded.id, 200_000);
    const refundOrder = await buyProxy(refunded.id, 7, "refunded");
    expect(refundOrder.result).toBeNull();
    const refundStatus = await db.query<{ status: string }>(
      `select status from referrals where referee_id=$1`,
      [refunded.id],
    );
    expect(refundStatus.rows[0].status).toBe("pending");
  });

  it("ignores a referral without an external qualifying deposit", async () => {
    const referrer = await createTestUser("refempty");
    const referee = await createTestUser("refemptynew");
    await attach(referrer.id, referee.id, await codeFor(referrer.id));

    const db = await getDb();
    const balance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [referrer.id],
    );
    expect(Number(balance.rows[0].balance)).toBe(0);
    const status = await db.query<{ status: string }>(
      `select status from referrals where referee_id=$1`,
      [referee.id],
    );
    expect(status.rows[0].status).toBe("registered");
  });

  it("does not reward funds received from another user", async () => {
    process.env.ENABLE_WALLET_TRANSFERS = "true";
    const db = await getDb();
    await db.query(
      `update app_settings set value='true'::jsonb where key='wallet_transfers_enabled'`,
    );
    const referrer = await createTestUser("transferref");
    const referee = await createTestUser("transfernew");
    await attach(referrer.id, referee.id, await codeFor(referrer.id));
    await fundWallet(referrer.id, 500_000);
    await transferWalletFunds({
      senderId: referrer.id,
      recipientId: referee.id,
      amountMinor: 300_000,
    });
    const status = await db.query<{ status: string }>(
      `select status from referrals where referee_id=$1`,
      [referee.id],
    );
    expect(status.rows[0].status).toBe("registered");
    const rewards = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='referral_credit'`,
      [referrer.id],
    );
    expect(rewards.rows[0].count).toBe(0);
  });

  it("rejects self-referral attachment", async () => {
    const user = await createTestUser("selfref");
    const code = await codeFor(user.id);
    const db = await getDb();
    const attached = await db.transaction((tx) =>
      attachReferralForSignup(tx, user.id, code),
    );
    expect(attached).toBeNull();
  });
});

describe("referral visibility", () => {
  it("shows a registered referral immediately without deposit or purchase", async () => {
    const referrer = await createTestUser("visref");
    const referee = await createTestUser("visnew");
    const code = await codeFor(referrer.id);
    const db = await getDb();
    await db.transaction((tx) => attachReferralForSignup(tx, referee.id, code));
    const dashboard = await getReferralDashboard(referrer.id);
    expect(dashboard.stats.total).toBe(1);
    expect(dashboard.referrals[0]?.status).toBe("registered");
    expect(dashboard.referrals[0]?.refereeUsername).toBe(referee.username);
    expect(dashboard.stats.rewarded).toBe(0);
  });
});
