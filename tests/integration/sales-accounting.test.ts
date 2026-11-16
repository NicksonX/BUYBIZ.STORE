import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { getAdminAnalytics, getAdminSalesRange } from "@/server/data/admin";
import { purchaseProxy } from "@/server/services/purchase";
import { createTestInventory, createTestUser, fundWallet, pauseAllInventory } from "../helpers";

beforeAll(async () => { await getDb(); });

describe("admin sales accounting", () => {
  it("counts only fulfilled proxy orders and nets linked refunds", async () => {
    await pauseAllInventory();
    const db = await getDb();
    const now = new Date();
    const start = new Date(now.getTime() - 60_000);
    const end = new Date(now.getTime() + 60_000);
    const before = await getAdminSalesRange(start, end);

    const user = await createTestUser("sales");
    await fundWallet(user.id, 100_000);
    const inventory = await createTestInventory({ maxSeats: 10 });
    const purchase = await purchaseProxy({
      userId: user.id,
      productSlug: "proxy-24-hours",
      idempotencyKey: randomUUID(),
      countryCode: "US",
    });
    expect(purchase.outcome).toBe("allocated");
    if (purchase.outcome !== "allocated") return;

    const wallet = await db.query<{ id: string }>(`select id from wallet_accounts where user_id=$1`, [user.id]);
    await db.query(
      `insert into wallet_ledger (wallet_account_id,user_id,entry_type,amount_minor,balance_after_minor,currency,reference,related_order_id,description)
       values ($1,$2,'refund_credit',10000,40000,'NGN','sales:partial-refund',$3,'Partial refund')`,
      [wallet.rows[0].id, user.id, purchase.orderId],
    );
    const badOrder = randomUUID();
    await db.query(
      `insert into orders (id,order_number,user_id,product_id,amount_minor,currency,status,failure_reason,idempotency_key,created_at,completed_at)
       values ($1,$2,$3,$4,50000,'NGN','refunded','OUT_OF_STOCK',$5,now(),now())`,
      [badOrder, `BZ-BAD-${badOrder.slice(0,6)}`, user.id, inventory.id ? (await db.query<{id:string}>(`select id from products where slug='proxy-24-hours'`)).rows[0].id : inventory.id, `bad-${badOrder}`],
    );
    await db.query(
      `insert into deposits (id,user_id,provider,provider_reference,amount_minor,currency,status,credited_at,created_at)
       values ($1,$2,'paystack',$3,10000,'NGN','credited',now(),now())`,
      [randomUUID(), user.id, `SALES-${randomUUID()}`],
    );

    const after = await getAdminSalesRange(start, end);
    expect(after.grossSales - before.grossSales).toBe(50_000);
    expect(after.refunds - before.refunds).toBe(10_000);
    expect(after.netSales - before.netSales).toBe(40_000);
    expect(after.deposits - before.deposits).toBe(10_000);
    expect(after.successfulOrders - before.successfulOrders).toBe(1);
    expect(after.failedOrders - before.failedOrders).toBe(1);
    const analytics = await getAdminAnalytics(1);
    expect(analytics.netSales).toBeGreaterThanOrEqual(0);
  });
});
