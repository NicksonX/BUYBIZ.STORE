import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { purchaseProxy } from "@/server/services/purchase";
import {
  getSwitchOptions,
  getTerminationQuote,
  switchProxy,
  terminateProxy,
} from "@/server/services/proxy-management";
import {
  createTestInventory,
  createTestUser,
  fundWallet,
  pauseAllInventory,
} from "../helpers";

const key = () => randomUUID();
const SEVEN_DAY_PRICE = 100_000;

beforeAll(async () => {
  await getDb();
});

beforeEach(async () => {
  await pauseAllInventory();
});

async function buySevenDay(userId: string) {
  const result = await purchaseProxy({
    userId,
    productSlug: "proxy-7-days",
    idempotencyKey: key(),
  });
  if (result.outcome !== "allocated") throw new Error("Expected allocation");
  return result;
}

describe("proxy termination", () => {
  it("calculates completed-day refunds and credits the wallet only once", async () => {
    const user = await createTestUser("terminate");
    await fundWallet(user.id, SEVEN_DAY_PRICE + 10_000);
    const inventory = await createTestInventory({ maxSeats: 10, productSlug: "proxy-7-days" });
    const purchase = await buySevenDay(user.id);

    const db = await getDb();
    await db.query(
      `update proxy_allocations
          set activated_at = now() - interval '2 days',
              expires_at = now() + interval '5 days'
        where id = $1`,
      [purchase.allocationId],
    );

    const quote = await getTerminationQuote(user.id, purchase.allocationId);
    expect(quote.daysUsed).toBe(2);
    expect(quote.usedMinor).toBe(Math.ceil((SEVEN_DAY_PRICE * 2) / 7));
    expect(quote.refundMinor).toBe(SEVEN_DAY_PRICE - Math.ceil((SEVEN_DAY_PRICE * 2) / 7));

    const result = await terminateProxy({
      userId: user.id,
      allocationId: purchase.allocationId,
    });
    expect(result.refundMinor).toBe(quote.refundMinor);

    const allocation = await db.query<{ status: string }>(
      `select status::text as status from proxy_allocations where id = $1`,
      [purchase.allocationId],
    );
    expect(allocation.rows[0].status).toBe("terminated");

    const terminations = await db.query<{ count: number; refund: number }>(
      `select count(*)::int as count, max(refund_minor)::bigint as refund
         from proxy_terminations where allocation_id = $1`,
      [purchase.allocationId],
    );
    expect(terminations.rows[0].count).toBe(1);
    expect(Number(terminations.rows[0].refund)).toBe(quote.refundMinor);

    const ledger = await db.query<{ count: number; refund: number }>(
      `select count(*)::int as count, coalesce(sum(amount_minor),0)::bigint as refund
         from wallet_ledger
        where user_id=$1 and reference=$2 and entry_type='refund_credit'`,
      [user.id, `termination:${purchase.allocationId}`],
    );
    expect(ledger.rows[0].count).toBe(1);
    expect(Number(ledger.rows[0].refund)).toBe(quote.refundMinor);

    await expect(
      terminateProxy({ userId: user.id, allocationId: purchase.allocationId }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const credits = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='refund_credit'`,
      [user.id],
    );
    expect(credits.rows[0].count).toBe(1);

    const seats = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations
        where proxy_inventory_id=$1 and status='active' and expires_at > now()`,
      [inventory.id],
    );
    expect(seats.rows[0].count).toBe(0);
  });

  it("rejects termination after the access window has ended", async () => {
    const user = await createTestUser("terminateexpired");
    await fundWallet(user.id, SEVEN_DAY_PRICE);
    await createTestInventory({ maxSeats: 10, productSlug: "proxy-7-days" });
    const purchase = await buySevenDay(user.id);
    const db = await getDb();
    await db.query(
      `update proxy_allocations
          set activated_at = now() - interval '8 days',
              expires_at = now() - interval '1 day'
        where id=$1`,
      [purchase.allocationId],
    );

    await expect(
      terminateProxy({ userId: user.id, allocationId: purchase.allocationId }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const credits = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='refund_credit'`,
      [user.id],
    );
    expect(credits.rows[0].count).toBe(0);
  });
});

describe("proxy switching", () => {
  it("never offers or accepts a different subscription duration", async () => {
    const user = await createTestUser("switchduration");
    await fundWallet(user.id, SEVEN_DAY_PRICE);
    await createTestInventory({ maxSeats: 10, productSlug: "proxy-7-days" });
    const short = await createTestInventory({ maxSeats: 10, productSlug: "proxy-24-hours" });
    const purchase = await buySevenDay(user.id);
    const options = await getSwitchOptions(user.id, purchase.allocationId);
    expect(options.map((option) => option.id)).not.toContain(short.id);
    await expect(
      switchProxy({ userId: user.id, allocationId: purchase.allocationId, inventoryId: short.id }),
    ).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
  });

  it("moves the slot without changing the subscription window or charging twice", async () => {
    const user = await createTestUser("switch");
    await fundWallet(user.id, SEVEN_DAY_PRICE);
    const source = await createTestInventory({ maxSeats: 10, productSlug: "proxy-7-days" });
    const target = await createTestInventory({ maxSeats: 10, productSlug: "proxy-7-days" });
    const purchase = await buySevenDay(user.id);
    const db = await getDb();
    const before = await db.query<{
      activatedAt: Date;
      expiresAt: Date;
      inventoryId: string;
    }>(
      `select activated_at as "activatedAt", expires_at as "expiresAt",
              proxy_inventory_id as "inventoryId"
         from proxy_allocations where id=$1`,
      [purchase.allocationId],
    );

    const options = await getSwitchOptions(user.id, purchase.allocationId);
    expect(options.map((option) => option.id)).toContain(target.id);
    expect(options.map((option) => option.id)).not.toContain(source.id);

    await switchProxy({
      userId: user.id,
      allocationId: purchase.allocationId,
      inventoryId: target.id,
    });

    const after = await db.query<{
      activatedAt: Date;
      expiresAt: Date;
      inventoryId: string;
    }>(
      `select activated_at as "activatedAt", expires_at as "expiresAt",
              proxy_inventory_id as "inventoryId"
         from proxy_allocations where id=$1`,
      [purchase.allocationId],
    );
    expect(after.rows[0].inventoryId).toBe(target.id);
    expect(new Date(after.rows[0].expiresAt).toISOString()).toBe(
      new Date(before.rows[0].expiresAt).toISOString(),
    );
    expect(new Date(after.rows[0].activatedAt).toISOString()).toBe(
      new Date(before.rows[0].activatedAt).toISOString(),
    );

    const history = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_switches where allocation_id=$1`,
      [purchase.allocationId],
    );
    expect(history.rows[0].count).toBe(1);

    const sourceSeats = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations
        where proxy_inventory_id=$1 and status='active' and expires_at > now()`,
      [source.id],
    );
    const targetSeats = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations
        where proxy_inventory_id=$1 and status='active' and expires_at > now()`,
      [target.id],
    );
    expect(sourceSeats.rows[0].count).toBe(0);
    expect(targetSeats.rows[0].count).toBe(1);

    const debits = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='purchase_debit'`,
      [user.id],
    );
    expect(debits.rows[0].count).toBe(1);
    expect(await getSwitchOptions(user.id, purchase.allocationId)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: source.id })]),
    );
  });

  it("prevents two customers from taking the last target slot", async () => {
    const first = await createTestUser("switchracea");
    const second = await createTestUser("switchraceb");
    await fundWallet(first.id, SEVEN_DAY_PRICE);
    await fundWallet(second.id, SEVEN_DAY_PRICE);
    const source = await createTestInventory({ maxSeats: 10, productSlug: "proxy-7-days" });
    const firstBuy = await buySevenDay(first.id);
    const secondBuy = await buySevenDay(second.id);
    const target = await createTestInventory({ maxSeats: 1, productSlug: "proxy-7-days" });

    const results = await Promise.allSettled([
      switchProxy({
        userId: first.id,
        allocationId: firstBuy.allocationId,
        inventoryId: target.id,
      }),
      switchProxy({
        userId: second.id,
        allocationId: secondBuy.allocationId,
        inventoryId: target.id,
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toMatchObject({ code: "PROXY_AT_CAPACITY" });
    }

    const db = await getDb();
    const failedIndex = results.findIndex((result) => result.status === "rejected");
    const failedUserId = [first.id, second.id][failedIndex];
    const failedAllocation = await db.query<{ inventoryId: string }>(
      `select proxy_inventory_id as "inventoryId" from proxy_allocations
        where user_id=$1 and status='active'`,
      [failedUserId],
    );
    expect(failedAllocation.rows[0].inventoryId).toBe(source.id);

    const seats = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_allocations
        where proxy_inventory_id=$1 and status='active' and expires_at > now()`,
      [target.id],
    );
    expect(seats.rows[0].count).toBe(1);
    const switches = await db.query<{ count: number }>(
      `select count(*)::int as count from proxy_switches where to_inventory_id=$1`,
      [target.id],
    );
    expect(switches.rows[0].count).toBe(1);
  });
});
