import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { creditDepositFromVerification } from "@/server/services/deposits";
import { attachReferralForSignup } from "@/server/services/referrals";
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

async function codeFor(userId: string) {
  const db = await getDb();
  const result = await db.query<{ code: string }>(
    `select referral_code as code from profiles where id=$1`,
    [userId],
  );
  return result.rows[0].code;
}

describe("referral rewards", () => {
  it("credits ₦1,000 once after a single external deposit of ₦2,000", async () => {
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
    expect(pending.rows[0].status).toBe("pending");
    let referrerBalance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [referrer.id],
    );
    expect(Number(referrerBalance.rows[0].balance)).toBe(0);

    await deposit(referee.id, 200_000);
    const rewarded = await db.query<{ status: string; reward: number }>(
      `select status, reward_amount_minor::bigint as reward from referrals where referee_id=$1`,
      [referee.id],
    );
    expect(rewarded.rows[0].status).toBe("rewarded");
    expect(Number(rewarded.rows[0].reward)).toBe(100_000);

    referrerBalance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [referrer.id],
    );
    expect(Number(referrerBalance.rows[0].balance)).toBe(100_000);

    // A second qualifying deposit must not pay again.
    await deposit(referee.id, 200_000);
    const rewards = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='referral_credit'`,
      [referrer.id],
    );
    expect(rewards.rows[0].count).toBe(1);
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
    expect(status.rows[0].status).toBe("pending");
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
    expect(status.rows[0].status).toBe("pending");
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
