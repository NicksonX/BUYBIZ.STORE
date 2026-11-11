import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { purchaseProxy } from "@/server/services/purchase";
import { renewProxy } from "@/server/services/renewals";
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

async function buy(userId: string, inventoryId?: string) {
  void inventoryId;
  const result = await purchaseProxy({
    userId,
    productSlug: "proxy-24-hours",
    idempotencyKey: randomUUID(),
  });
  if (result.outcome !== "allocated") throw new Error("Expected an allocation");
  return result;
}

describe("manual proxy renewals", () => {
  it("extends from the current expiry and debits the wallet once", async () => {
    const user = await createTestUser("renew");
    await fundWallet(user.id, 150_000);
    await createTestInventory({ maxSeats: 10, expiresInSeconds: 10 * 86400 });
    const purchase = await buy(user.id);

    const before = await getDb().then((db) =>
      db.query<{ expiresAt: Date }>(
        `select expires_at as "expiresAt" from proxy_allocations where id=$1`,
        [purchase.allocationId],
      ),
    );
    const result = await renewProxy({
      userId: user.id,
      allocationId: purchase.allocationId,
      idempotencyKey: randomUUID(),
    });
    expect(result.outcome).toBe("renewed");
    expect(result.newExpiresAt.getTime()).toBeGreaterThan(
      new Date(before.rows[0].expiresAt).getTime(),
    );

    const db = await getDb();
    const balance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [user.id],
    );
    expect(Number(balance.rows[0].balance)).toBe(50_000);
    const renewal = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_renewals where allocation_id=$1`,
      [purchase.allocationId],
    );
    expect(renewal.rows[0].count).toBe(1);
  });

  it("rejects a renewal when the upstream cannot cover the extension", async () => {
    const user = await createTestUser("renewlife");
    await fundWallet(user.id, 150_000);
    const inventory = await createTestInventory({
      maxSeats: 10,
      expiresInSeconds: 10 * 86400,
    });
    const purchase = await buy(user.id, inventory.id);
    const db = await getDb();
    await db.query(
      `update proxy_inventory set upstream_expires_at = now() + interval '2 hours' where id=$1`,
      [inventory.id],
    );
    const balanceBefore = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [user.id],
    );

    await expect(
      renewProxy({
        userId: user.id,
        allocationId: purchase.allocationId,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const balanceAfter = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [user.id],
    );
    expect(Number(balanceAfter.rows[0].balance)).toBe(
      Number(balanceBefore.rows[0].balance),
    );
  });

  it("does not renew an expired allocation", async () => {
    const user = await createTestUser("renewexpired");
    await fundWallet(user.id, 150_000);
    await createTestInventory({ maxSeats: 10, expiresInSeconds: 10 * 86400 });
    const purchase = await buy(user.id);
    const db = await getDb();
    await db.query(
      `update proxy_allocations set activated_at=now()-interval '2 days', expires_at=now()-interval '1 hour' where id=$1`,
      [purchase.allocationId],
    );
    await expect(
      renewProxy({
        userId: user.id,
        allocationId: purchase.allocationId,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
