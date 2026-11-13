import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  getAmbassadorConfig,
  getAmbassadorDashboard,
  qualifyReferralForAmbassador,
  requestAmbassadorWithdrawal,
  submitAmbassadorAddress,
  verifyAmbassadorAddress,
} from "@/server/services/ambassador";
import { createTestUser } from "../helpers";

beforeAll(async () => {
  await getDb();
});

beforeEach(async () => {
  // Each test uses unique users; no global inventory is involved.
});

async function insertReferral(referrerId: string, refereeId: string) {
  const db = await getDb();
  return (
    await db.query<{ id: string }>(
      `insert into referrals (referrer_id, referee_id, referral_code)
       values ($1,$2,'TESTREF') returning id`,
      [referrerId, refereeId],
    )
  ).rows[0].id;
}

describe("ambassador promotion and USD commissions", () => {
  it("promotes after 10 qualified referrals without touching NGN wallet credits", async () => {
    const referrer = await createTestUser("amb");
    const db = await getDb();
    let last: Awaited<ReturnType<typeof qualifyReferralForAmbassador>> = null;
    for (let index = 0; index < 10; index += 1) {
      const referee = await createTestUser(`ref${index}`);
      const referralId = await insertReferral(referrer.id, referee.id);
      last = await db.transaction((tx) =>
        qualifyReferralForAmbassador(tx, {
          refereeId: referee.id,
          eventType: "deposit",
          eventRef: randomUUID(),
          amountMinor: 300_000,
        }),
      );
      if (index < 9) expect(last?.promoted).toBe(false);
      expect(referralId).toBeTruthy();
    }
    expect(last?.promoted).toBe(true);
    expect(last?.qualifiedCount).toBe(10);
    expect(last?.commissions).toBe(10);

    const ambassador = await db.query(
      `select 1 from ambassador_profiles where user_id=$1`,
      [referrer.id],
    );
    expect(ambassador.rows.length).toBe(1);
    const commissions = await db.query<{ count: number; total: number }>(
      `select count(*)::int as count, coalesce(sum(amount_usd_cents),0)::int as total
         from ambassador_commissions where ambassador_id=$1`,
      [referrer.id],
    );
    expect(commissions.rows[0]).toEqual({ count: 10, total: 3000 });
    const usdLedger = await db.query<{ total: number }>(
      `select coalesce(sum(amount_usd_cents),0)::int as total
         from ambassador_ledger where user_id=$1`,
      [referrer.id],
    );
    expect(usdLedger.rows[0].total).toBe(3000);
    const ngnLedger = await db.query<{ total: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as total
         from wallet_ledger where user_id=$1`,
      [referrer.id],
    );
    expect(Number(ngnLedger.rows[0].total)).toBe(0);

    const mail = await db.query<{ type: string; count: number }>(
      `select email_type as type, count(*)::int as count
         from email_deliveries where user_id=$1
        group by email_type order by email_type`,
      [referrer.id],
    );
    expect(mail.rows.find((row) => row.type === "ambassador_promotion")?.count).toBe(1);
    expect(mail.rows.find((row) => row.type === "ambassador_commission")?.count).toBe(10);

    const dashboard = await getAmbassadorDashboard(referrer.id);
    expect(dashboard.isAmbassador).toBe(true);
    expect(dashboard.qualified).toBe(10);
    expect(dashboard.availableCents).toBe(3000);
    expect(dashboard.earnedCents).toBe(3000);
  });

  it("does not duplicate a commission for the same referral", async () => {
    const referrer = await createTestUser("ambdup");
    const db = await getDb();
    for (let index = 0; index < 10; index += 1) {
      const referee = await createTestUser(`dup${index}`);
      await insertReferral(referrer.id, referee.id);
      await db.transaction((tx) =>
        qualifyReferralForAmbassador(tx, {
          refereeId: referee.id,
          eventType: "deposit",
          eventRef: randomUUID(),
          amountMinor: 300_000,
        }),
      );
    }
    const firstReferee = await db.query<{ id: string }>(
      `select referee_id as id from referrals where referrer_id=$1 limit 1`,
      [referrer.id],
    );
    const duplicate = await db.transaction((tx) =>
      qualifyReferralForAmbassador(tx, {
        refereeId: firstReferee.rows[0].id,
        eventType: "deposit",
        eventRef: randomUUID(),
        amountMinor: 300_000,
      }),
    );
    expect(duplicate).toBeNull();
    const count = await db.query<{ count: number }>(
      `select count(*)::int as count from ambassador_commissions where ambassador_id=$1`,
      [referrer.id],
    );
    expect(count.rows[0].count).toBe(10);
  });
});

describe("ambassador USDT payouts", () => {
  it("requires a verified BEP20 address, reserves $10 and prevents duplicate open requests", async () => {
    const referrer = await createTestUser("payout");
    const admin = await createTestUser("payoutadmin");
    const db = await getDb();
    await db.query(`update profiles set role='admin' where id=$1`, [admin.id]);
    for (let index = 0; index < 10; index += 1) {
      const referee = await createTestUser(`pay${index}`);
      await insertReferral(referrer.id, referee.id);
      await db.transaction((tx) =>
        qualifyReferralForAmbassador(tx, {
          refereeId: referee.id,
          eventType: "deposit",
          eventRef: randomUUID(),
          amountMinor: 300_000,
        }),
      );
    }
    const config = await getAmbassadorConfig();
    expect(config.withdrawalMinCents).toBe(1000);

    await expect(
      submitAmbassadorAddress(referrer.id, "not-a-wallet"),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    await submitAmbassadorAddress(referrer.id, address);
    const pending = await db.query<{ id: string }>(
      `select id from ambassador_wallet_addresses where user_id=$1 and status='pending' order by created_at desc limit 1`,
      [referrer.id],
    );
    await db.transaction((tx) =>
      verifyAmbassadorAddress(tx, {
        addressId: pending.rows[0].id,
        adminId: admin.id,
        adminRole: "admin",
        approve: true,
      }),
    );

    const payout = await requestAmbassadorWithdrawal(referrer.id, 1000);
    expect(payout.amountCents).toBe(1000);
    const available = await db.query<{ total: number }>(
      `select coalesce(sum(amount_usd_cents),0)::int as total
         from ambassador_ledger where user_id=$1`,
      [referrer.id],
    );
    expect(available.rows[0].total).toBe(2000);
    const row = await db.query<{ status: string; address: string }>(
      `select status, wallet_address as address from ambassador_withdrawals where id=$1`,
      [payout.id],
    );
    expect(row.rows[0]).toEqual({ status: "pending", address });
    await expect(requestAmbassadorWithdrawal(referrer.id, 1000)).rejects.toBeInstanceOf(
      AppError,
    );
    const mail = await db.query<{ count: number }>(
      `select count(*)::int as count from email_deliveries
        where user_id=$1 and email_type='payout_requested'`,
      [referrer.id],
    );
    expect(mail.rows[0].count).toBe(1);
  });
});

describe("uncapped ambassador rewards", () => {
  it("continues paying $3 for referrals after the unlock threshold", async () => {
    const referrer = await createTestUser("ambuncapped");
    const db = await getDb();
    for (let index = 0; index < 12; index += 1) {
      const referee = await createTestUser(`uncap${index}`);
      await insertReferral(referrer.id, referee.id);
      await db.transaction((tx) =>
        qualifyReferralForAmbassador(tx, {
          refereeId: referee.id,
          eventType: "deposit",
          eventRef: randomUUID(),
          amountMinor: 300_000,
        }),
      );
    }
    const result = await db.query<{ count: number; total: number }>(
      `select count(*)::int as count, coalesce(sum(amount_usd_cents),0)::int as total
         from ambassador_commissions where ambassador_id=$1`,
      [referrer.id],
    );
    expect(result.rows[0]).toEqual({ count: 12, total: 3600 });
    const dashboard = await getAmbassadorDashboard(referrer.id);
    expect(dashboard.availableCents).toBe(3600);
  });
});
