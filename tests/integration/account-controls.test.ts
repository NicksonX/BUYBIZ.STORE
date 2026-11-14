import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import type { Profile } from "@/lib/db/types";
import { getAppSettings } from "@/server/data/settings";
import { createDeposit, completeDemoDeposit } from "@/server/services/deposits";
import { purchaseProxy } from "@/server/services/purchase";
import {
  createTestInventory,
  createTestUser,
  fundWallet,
  pauseAllInventory,
} from "../helpers";

beforeAll(async () => {
  await getDb();
});

beforeEach(async () => {
  await pauseAllInventory();
});

describe("wallet credit minimum", () => {
  it("enforces ₦1,500 on the server and credits 1:1", async () => {
    const settings = await getAppSettings();
    expect(settings.depositMinMinor).toBe(150_000);
    const user = await createTestUser("creditmin");
    const profile: Profile = {
      ...user,
      displayName: null,
      avatarUrl: null,
      role: "customer",
      status: "active",
      emailVerified: true,
      onboardingComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await expect(
      createDeposit({ user: profile, amountMinor: 149_999, clientReference: `BZ-${randomUUID()}` }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const deposit = await createDeposit({
      user: profile,
      amountMinor: 150_000,
      clientReference: `BZ-${randomUUID()}`,
    });
    await completeDemoDeposit({
      depositId: deposit.depositId,
      userId: user.id,
    });
    const db = await getDb();
    const balance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance
         from wallet_ledger where user_id=$1`,
      [user.id],
    );
    expect(Number(balance.rows[0].balance)).toBe(150_000);
  });
});

describe("inactivity freeze", () => {
  it("freezes after 60 days, preserves credits, and is idempotent", async () => {
    const user = await createTestUser("inactive");
    await fundWallet(user.id, 12_345);
    const db = await getDb();
    await db.query(
      `update profiles set last_activity_at = now() - interval '61 days' where id=$1`,
      [user.id],
    );

    const first = await db.query<{ result: { frozen: number } }>(
      `select public.run_inactivity_jobs() as result`,
    );
    expect(Number(first.rows[0].result.frozen)).toBeGreaterThanOrEqual(1);

    const profile = await db.query<{
      status: string;
      frozenAt: Date | null;
      balance: number;
    }>(
      `select p.status::text as status, p.frozen_at as "frozenAt",
              coalesce((select sum(amount_minor) from wallet_ledger l where l.user_id=p.id),0)::bigint as balance
         from profiles p where p.id=$1`,
      [user.id],
    );
    expect(profile.rows[0].status).toBe("frozen");
    expect(profile.rows[0].frozenAt).not.toBeNull();
    expect(Number(profile.rows[0].balance)).toBe(12_345);

    const freezes = await db.query<{ count: number }>(
      `select count(*)::int as count from account_freezes where user_id=$1`,
      [user.id],
    );
    const alert = await db.query<{ count: number; body: string }>(
      `select count(*)::int as count, max(body) as body from admin_notifications
        where related_user_id=$1 and type='account_frozen'`,
      [user.id],
    );
    expect(freezes.rows[0].count).toBe(1);
    expect(alert.rows[0].count).toBe(1);
    expect(alert.rows[0].body).toContain("preserved");

    const second = await db.query<{ result: { frozen: number } }>(
      `select public.run_inactivity_jobs() as result`,
    );
    expect(Number(second.rows[0].result.frozen)).toBe(0);
    const after = await db.query<{ count: number }>(
      `select count(*)::int as count from account_freezes where user_id=$1`,
      [user.id],
    );
    expect(after.rows[0].count).toBe(1);

    await expect(
      purchaseProxy({
        userId: user.id,
        productSlug: "proxy-24-hours",
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "ACCOUNT_FROZEN" });
  });
});

describe("inventory package isolation", () => {
  it("does not sell 24-hour inventory as a 7-day plan", async () => {
    const user = await createTestUser("category");
    await fundWallet(user.id, 100_000);
    await createTestInventory({ maxSeats: 10, productSlug: "proxy-24-hours" });

    const result = await purchaseProxy({
      userId: user.id,
      productSlug: "proxy-7-days",
      idempotencyKey: randomUUID(),
    });
    expect(result.outcome).toBe("refunded");
    const db = await getDb();
    const allocations = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations where user_id=$1`,
      [user.id],
    );
    expect(allocations.rows[0].count).toBe(0);
  });
});

describe("administrator reminders", () => {
  it("creates one daily and one weekly rotation reminder without duplicates", async () => {
    const user = await createTestUser("rotationreminder");
    await fundWallet(user.id, 100_000);
    const daily = await createTestInventory({
      maxSeats: 10,
      productSlug: "proxy-24-hours",
      expiresInSeconds: 30 * 86400,
    });
    const weekly = await createTestInventory({
      maxSeats: 10,
      productSlug: "proxy-7-days",
      expiresInSeconds: 30 * 86400,
    });
    const db = await getDb();
    await db.query(
      `update proxy_inventory
          set rotation_interval_hours=24, next_rotation_at=now()-interval '1 hour'
        where id=$1`,
      [daily.id],
    );
    await db.query(
      `update proxy_inventory
          set rotation_interval_hours=168, next_rotation_at=now()-interval '1 hour'
        where id=$1`,
      [weekly.id],
    );

    await db.query(`select public.run_admin_reminder_jobs()`);
    const first = await db.query<{ type: string; body: string; count: number }>(
      `select type, max(body) as body, count(*)::int as count
         from admin_notifications
        where related_inventory_id = any($1::uuid[])
        group by type`,
      [[daily.id, weekly.id]],
    );
    const byType = new Map(first.rows.map((row) => [row.type, row]));
    expect(byType.get("rotation_due_24h")?.count).toBe(1);
    expect(byType.get("rotation_due_7d")?.count).toBe(1);
    expect(byType.get("rotation_due_24h")?.body).toContain(
      "BUYBIZ REMINDER: Your 24-hour proxy credentials are due for rotation.",
    );
    expect(byType.get("rotation_due_7d")?.body).toContain(
      "BUYBIZ REMINDER: Your 7-day proxy credentials are due for rotation.",
    );

    await db.query(`select public.run_admin_reminder_jobs()`);
    const second = await db.query<{ count: number }>(
      `select count(*)::int as count from admin_notifications
        where related_inventory_id = any($1::uuid[]) and type like 'rotation_due_%'`,
      [[daily.id, weekly.id]],
    );
    expect(second.rows[0].count).toBe(2);
  });
});
