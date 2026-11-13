import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { purchaseProxy } from "@/server/services/purchase";
import {
  createTestInventory,
  createTestUser,
  fundWallet,
  pauseAllInventory,
} from "../helpers";

const PRICE = 50_000;
const key = () => randomUUID();

beforeAll(async () => {
  await getDb();
});

beforeEach(async () => {
  await pauseAllInventory();
});

describe("atomic proxy purchase", () => {
  it("debits exactly once and creates one allocation", async () => {
    const user = await createTestUser("buy");
    await fundWallet(user.id, 100_000);
    const inventory = await createTestInventory({ maxSeats: 10 });

    const result = await purchaseProxy({
      userId: user.id,
      productSlug: "proxy-24-hours",
      idempotencyKey: key(),
    });

    expect(result.outcome).toBe("allocated");
    const db = await getDb();
    const order = await db.query<{ status: string; amountMinor: number }>(
      `select status, amount_minor as "amountMinor" from orders where user_id=$1`,
      [user.id],
    );
    expect(order.rows[0].status).toBe("completed");
    expect(Number(order.rows[0].amountMinor)).toBe(PRICE);

    const allocations = await db.query<{ count: number; inventoryId: string }>(
      `select count(*)::int as count, min(proxy_inventory_id::text) as "inventoryId"
         from proxy_allocations where user_id=$1`,
      [user.id],
    );
    expect(allocations.rows[0].count).toBe(1);
    expect(allocations.rows[0].inventoryId).toBe(inventory.id);

    const balance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [user.id],
    );
    expect(Number(balance.rows[0].balance)).toBe(100_000 - PRICE);

    const ledger = await db.query<{ type: string; count: number }>(
      `select entry_type::text as type, count(*)::int as count
         from wallet_ledger where user_id=$1 and entry_type='purchase_debit' group by entry_type`,
      [user.id],
    );
    expect(ledger.rows[0].count).toBe(1);
  });

  it("refunds automatically when there is no eligible stock", async () => {
    const user = await createTestUser("nostock");
    await fundWallet(user.id, PRICE);

    const result = await purchaseProxy({
      userId: user.id,
      productSlug: "proxy-24-hours",
      idempotencyKey: key(),
    });

    expect(result.outcome).toBe("refunded");
    if (result.outcome === "refunded") {
      expect(result.reason).toBe("OUT_OF_STOCK");
    }
    const db = await getDb();
    const balance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [user.id],
    );
    expect(Number(balance.rows[0].balance)).toBe(PRICE);
    const types = await db.query<{ type: string }>(
      `select entry_type::text as type from wallet_ledger where user_id=$1 order by created_at`,
      [user.id],
    );
    expect(types.rows.map((row) => row.type)).toContain("purchase_debit");
    expect(types.rows.map((row) => row.type)).toContain("refund_credit");
    const orders = await db.query<{ status: string }>(
      `select status from orders where user_id=$1`,
      [user.id],
    );
    expect(orders.rows[0].status).toBe("refunded");
  });

  it("refunds when the upstream does not cover the package lifetime", async () => {
    const user = await createTestUser("shortlife");
    await fundWallet(user.id, PRICE);
    await createTestInventory({ expiresInSeconds: 2 * 3600 });

    const result = await purchaseProxy({
      userId: user.id,
      productSlug: "proxy-24-hours",
      idempotencyKey: key(),
    });

    expect(result.outcome).toBe("refunded");
    if (result.outcome === "refunded") {
      expect(result.reason).toBe("INSUFFICIENT_STOCK_LIFETIME");
    }
    const db = await getDb();
    const balance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [user.id],
    );
    expect(Number(balance.rows[0].balance)).toBe(PRICE);
  });

  it("blocks a purchase with insufficient wallet balance", async () => {
    const user = await createTestUser("poor");
    await fundWallet(user.id, 100);
    await createTestInventory();

    await expect(
      purchaseProxy({
        userId: user.id,
        productSlug: "proxy-24-hours",
        idempotencyKey: key(),
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });

    const db = await getDb();
    const orders = await db.query<{ count: number }>(
      `select count(*)::int as count from orders where user_id=$1`,
      [user.id],
    );
    expect(orders.rows[0].count).toBe(0);
  });

  it("blocks suspended customers", async () => {
    const user = await createTestUser("suspended", { status: "suspended" });
    await fundWallet(user.id, PRICE);
    await createTestInventory();

    await expect(
      purchaseProxy({
        userId: user.id,
        productSlug: "proxy-24-hours",
        idempotencyKey: key(),
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("never sells more than 10 active seats under concurrency", async () => {
    const inventory = await createTestInventory({ maxSeats: 10, expiresInSeconds: 15 * 86400 });
    const users = await Promise.all(
      Array.from({ length: 12 }, (_, index) => createTestUser(`race${index}`)),
    );
    await Promise.all(users.map((user) => fundWallet(user.id, PRICE)));

    const outcomes = await Promise.allSettled(
      users.map((user) =>
        purchaseProxy({
          userId: user.id,
          productSlug: "proxy-24-hours",
          idempotencyKey: key(),
        }),
      ),
    );
    const fulfilled = outcomes.filter((item) => item.status === "fulfilled");
    expect(fulfilled).toHaveLength(12);

    const db = await getDb();
    const active = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations
        where proxy_inventory_id = $1 and status = 'active'`,
      [inventory.id],
    );
    expect(active.rows[0].count).toBe(10);

    const refunded = fulfilled.filter(
      (item) => item.status === "fulfilled" && item.value.outcome === "refunded",
    );
    expect(refunded).toHaveLength(2);
    const ledgerCheck = await db.query<{ bad: number }>(
      `select count(*)::int as bad from wallet_ledger
        where user_id = any($1::uuid[]) and entry_type='purchase_debit'
          and related_order_id in (
            select id from orders
             where user_id = any($1::uuid[]) and status = 'refunded'
          )`,
      [users.map((user) => user.id)],
    );
    expect(ledgerCheck.rows[0].bad).toBe(2);
  });

  it("expires one allocation without touching another customer's allocation", async () => {
    const first = await createTestUser("expirea");
    const second = await createTestUser("expireb");
    await fundWallet(first.id, PRICE);
    await fundWallet(second.id, PRICE);
    await createTestInventory({ maxSeats: 10 });

    const resultA = await purchaseProxy({
      userId: first.id,
      productSlug: "proxy-24-hours",
      idempotencyKey: key(),
    });
    const resultB = await purchaseProxy({
      userId: second.id,
      productSlug: "proxy-24-hours",
      idempotencyKey: key(),
    });
    expect(resultA.outcome).toBe("allocated");
    expect(resultB.outcome).toBe("allocated");
    if (resultA.outcome !== "allocated" || resultB.outcome !== "allocated") return;

    const db = await getDb();
    await db.query(
      `update proxy_allocations
        set activated_at = now() - interval '2 hours',
            expires_at = now() - interval '5 minutes'
      where id=$1`,
      [resultA.allocationId],
    );
    await db.query(`select * from run_lifecycle_jobs()`);

    const rows = await db.query<{ id: string; status: string }>(
      `select id, status from proxy_allocations where id in ($1,$2)`,
      [resultA.allocationId, resultB.allocationId],
    );
    const byId = new Map(rows.rows.map((row) => [row.id, row.status]));
    expect(byId.get(resultA.allocationId)).toBe("expired");
    expect(byId.get(resultB.allocationId)).toBe("active");
  });
});

describe("personal proxy", () => {
  it("uses a single-customer inventory and blocks a second active personal proxy", async () => {
    // Two separate single-customer proxies exist, so the block must come from
    // the per-customer product limit, not from stock exhaustion.
    await createTestInventory({ maxSeats: 1, accessType: "single", productSlug: "proxy-personal-30-days", expiresInSeconds: 45 * 86400 });
    await createTestInventory({ maxSeats: 1, accessType: "single", productSlug: "proxy-personal-30-days", expiresInSeconds: 45 * 86400 });
    const user = await createTestUser("personal");
    await fundWallet(user.id, 1_000_000);

    const first = await purchaseProxy({
      userId: user.id,
      productSlug: "proxy-personal-30-days",
      idempotencyKey: key(),
    });
    expect(first.outcome).toBe("allocated");

    await expect(
      purchaseProxy({
        userId: user.id,
        productSlug: "proxy-personal-30-days",
        idempotencyKey: key(),
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const db = await getDb();
    const active = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations
        where user_id=$1 and status='active' and expires_at > now()`,
      [user.id],
    );
    expect(active.rows[0].count).toBe(1);
  });
});

describe("package catalogue and durations", () => {
  it("sells the 30-day package only from 30-day inventory", async () => {
    const user = await createTestUser("thirty");
    await fundWallet(user.id, 300_000);
    await createTestInventory({
      maxSeats: 10,
      productSlug: "proxy-30-days",
      expiresInSeconds: 45 * 86400,
    });

    const result = await purchaseProxy({
      userId: user.id,
      productSlug: "proxy-30-days",
      idempotencyKey: key(),
    });
    expect(result.outcome).toBe("allocated");
    if (result.outcome !== "allocated") return;

    const db = await getDb();
    const duration = await db.query<{ hours: number }>(
      `select extract(epoch from (expires_at - activated_at)) / 3600 as hours
         from proxy_allocations where id=$1`,
      [result.allocationId],
    );
    expect(Number(duration.rows[0].hours)).toBeCloseTo(720, 0);
  });
});
