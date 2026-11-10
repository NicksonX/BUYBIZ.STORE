import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { transferWalletFunds } from "@/server/services/transfers";
import { createTestUser, fundWallet, walletFor } from "../helpers";

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

describe("internal transfers behind a disabled flag", () => {
  it("refuses even when the caller has funds", async () => {
    const sender = await createTestUser("sender");
    const recipient = await createTestUser("recipient");
    await fundWallet(sender.id, 200_000);

    await expect(
      transferWalletFunds({
        senderId: sender.id,
        recipientId: recipient.id,
        amountMinor: 50_000,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("moves internal credit with double-entry when explicitly enabled in a test", async () => {
    process.env.ENABLE_WALLET_TRANSFERS = "true";
    const db = await getDb();
    await db.query(
      `update app_settings set value='true'::jsonb where key='wallet_transfers_enabled'`,
    );
    const sender = await createTestUser("enabledsend");
    const recipient = await createTestUser("enabledrecv");
    await fundWallet(sender.id, 200_000);

    const result = await transferWalletFunds({
      senderId: sender.id,
      recipientId: recipient.id,
      amountMinor: 50_000,
      note: "Vitest internal transfer",
    });
    expect(result.transferId).toBeTruthy();

    expect(Number((await walletFor(sender.id))!.balance)).toBe(150_000);
    expect(Number((await walletFor(recipient.id))!.balance)).toBe(50_000);

    const entries = await db.query<{ type: string; amount: number; related: string }>(
      `select entry_type::text as type, amount_minor as amount,
              related_transfer_id as related
         from wallet_ledger where related_transfer_id=$1 order by amount_minor`,
      [result.transferId],
    );
    expect(entries.rows).toHaveLength(2);
    expect(entries.rows.map((row) => row.type).sort()).toEqual([
      "transfer_credit",
      "transfer_debit",
    ]);
    expect(entries.rows.find((row) => row.type === "transfer_debit")?.amount).toBe(-50_000);
    expect(entries.rows.find((row) => row.type === "transfer_credit")?.amount).toBe(50_000);
  });

  it("rejects self-transfers and unverified recipients", async () => {
    process.env.ENABLE_WALLET_TRANSFERS = "true";
    const db = await getDb();
    await db.query(
      `update app_settings set value='true'::jsonb where key='wallet_transfers_enabled'`,
    );
    const sender = await createTestUser("selfsend");
    const unverified = await createTestUser("unverified", { verified: false });
    await fundWallet(sender.id, 200_000);

    await expect(
      transferWalletFunds({
        senderId: sender.id,
        recipientId: sender.id,
        amountMinor: 10_000,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    await expect(
      transferWalletFunds({
        senderId: sender.id,
        recipientId: unverified.id,
        amountMinor: 10_000,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
