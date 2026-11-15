import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { getWalletTransactions } from "@/server/data/customer";
import { createTestUser, fundWallet } from "../helpers";

beforeAll(async () => { await getDb(); });

describe("mobile wallet transaction history", () => {
  it("shows a clean four-field list with real statuses and no simulated labels", async () => {
    const user = await createTestUser("mobwallet");
    const db = await getDb();
    await fundWallet(user.id, 100_000);

    // Purchase debit and refund through the immutable ledger.
    const wallet = await db.query<{ id: string; balance: number }>(
      `select id, coalesce((select sum(amount_minor) from wallet_ledger where wallet_account_id = wallet_accounts.id),0)::bigint as balance
         from wallet_accounts where user_id=$1`,
      [user.id],
    );
    const walletId = wallet.rows[0].id;
    const orderId = randomUUID();
    await db.query(
      `insert into orders (id, order_number, user_id, product_id, amount_minor, currency, status, idempotency_key, created_at, completed_at)
       select $1, 'BZ-MOB-1', $2, id, 50000, 'NGN', 'completed', 'mob-wallet-1', now(), now() from products where slug='proxy-24-hours' limit 1`,
      [orderId, user.id],
    );
    await db.query(
      `insert into wallet_ledger (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor, currency, reference, related_order_id, description)
       values ($1,$2,'purchase_debit',-50000,$3,'NGN','mob:debit',$4,'Proxy purchase')`,
      [walletId, user.id, Number(wallet.rows[0].balance) - 50_000, orderId],
    );
    await db.query(
      `insert into wallet_ledger (wallet_account_id, user_id, entry_type, amount_minor, balance_after_minor, currency, reference, related_order_id, description)
       values ($1,$2,'refund_credit',20000,$3,'NGN','mob:refund',$4,'Wallet refund')`,
      [walletId, user.id, Number(wallet.rows[0].balance) - 30_000, orderId],
    );
    const pendingDepositId = randomUUID();
    const reference = `PS-MOB-${randomUUID().slice(0, 10)}`;
    await db.query(
      `insert into deposits (id, user_id, provider, provider_reference, amount_minor, currency, status, gateway_fee_minor, channel, created_at)
       values ($1,$2,'paystack',$3,150000,'NGN','pending',1500,'card',now())`,
      [pendingDepositId, user.id, reference],
    );

    const page = await getWalletTransactions(user.id, { limit: 20 });
    expect(page.items.length).toBe(4);
    expect(
      page.items.find(
        (item) => item.title === "Wallet deposit" && item.status === "pending" && item.amountMinor === 150_000,
      ),
    ).toBeTruthy();
    expect(page.items.some((item) => item.title === "Proxy purchase" && item.amountMinor === -50_000 && item.status === "completed")).toBe(true);
    expect(page.items.some((item) => item.title === "Wallet refund" && item.amountMinor === 20_000 && item.status === "refunded")).toBe(true);
    expect(page.items.some((item) => item.copyReference === reference)).toBe(true);
    expect(JSON.stringify(page.items)).not.toContain("Simulated");
    expect(JSON.stringify(page.items)).not.toContain("Demo top-up");

    const purchases = await getWalletTransactions(user.id, { filter: "purchases" });
    expect(purchases.items).toHaveLength(1);
    expect(purchases.items[0].title).toBe("Proxy purchase");
    const refunds = await getWalletTransactions(user.id, { filter: "refunds" });
    expect(refunds.items).toHaveLength(1);
    const deposits = await getWalletTransactions(user.id, { filter: "deposits" });
    expect(deposits.items).toHaveLength(2);
    const found = await getWalletTransactions(user.id, { query: "Proxy" });
    expect(found.items).toHaveLength(1);
    const paged = await getWalletTransactions(user.id, { limit: 2 });
    expect(paged.items).toHaveLength(2);
    expect(paged.nextOffset).not.toBeNull();
  });
});
