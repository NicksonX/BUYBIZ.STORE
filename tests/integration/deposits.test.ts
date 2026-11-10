import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { creditDepositFromVerification } from "@/server/services/deposits";
import { createTestUser } from "../helpers";

beforeAll(async () => {
  await getDb();
});

async function createDeposit(userId: string, amountMinor: number) {
  const db = await getDb();
  const id = randomUUID();
  const reference = `BZ-VITEST-${randomUUID()}`;
  await db.query(
    `insert into deposits (id, user_id, provider, provider_reference, amount_minor, currency, status)
     values ($1,$2,'paystack',$3,$4,'NGN','pending')`,
    [id, userId, reference, amountMinor],
  );
  return { id, reference };
}

function payload(reference: string, amountMinor: number) {
  return {
    status: "success",
    reference,
    amount: amountMinor,
    currency: "NGN",
    id: 987654,
    fees: 0,
    channel: "card",
    domain: "test",
  };
}

describe("verified deposit crediting", () => {
  it("credits exactly once even when verification runs twice", async () => {
    const user = await createTestUser("deposit");
    const deposit = await createDeposit(user.id, 100_000);

    const first = await creditDepositFromVerification({
      depositId: deposit.id,
      payload: payload(deposit.reference, 100_000),
    });
    const second = await creditDepositFromVerification({
      depositId: deposit.id,
      payload: payload(deposit.reference, 100_000),
    });

    expect(first.status).toBe("credited");
    expect(second.alreadyCredited).toBe(true);

    const db = await getDb();
    const credits = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='deposit_credit'`,
      [user.id],
    );
    expect(credits.rows[0].count).toBe(1);
    const balance = await db.query<{ balance: number }>(
      `select coalesce(sum(amount_minor),0)::bigint as balance from wallet_ledger where user_id=$1`,
      [user.id],
    );
    expect(Number(balance.rows[0].balance)).toBe(100_000);
  });

  it("marks a mismatched amount failed without crediting the wallet", async () => {
    const user = await createTestUser("badamount");
    const deposit = await createDeposit(user.id, 100_000);

    const result = await creditDepositFromVerification({
      depositId: deposit.id,
      payload: payload(deposit.reference, 90_000),
    });
    expect(result.status).toBe("failed");

    const db = await getDb();
    const credits = await db.query<{ count: number }>(
      `select count(*)::int as count from wallet_ledger
        where user_id=$1 and entry_type='deposit_credit'`,
      [user.id],
    );
    expect(credits.rows[0].count).toBe(0);
    const row = await db.query<{ status: string }>(
      `select status from deposits where id=$1`,
      [deposit.id],
    );
    expect(row.rows[0].status).toBe("failed");
  });
});
