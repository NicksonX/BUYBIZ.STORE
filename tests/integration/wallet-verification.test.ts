import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { submitAmbassadorAddress, verifyAmbassadorAddress } from "@/server/services/ambassador";
import { createTestUser } from "../helpers";

beforeAll(async () => { await getDb(); });

describe("wallet submission and verification lifecycle", () => {
  it("locks pending and verified addresses and allows resubmission only after rejection", async () => {
    const db = await getDb();
    const customer = await createTestUser("walletlock");
    const admin = await createTestUser("walletadmin");
    await db.query(`update profiles set role='super_admin' where id=$1`, [admin.id]);
    const firstAddress = "0x1111111111111111111111111111111111111111";
    const secondAddress = "0x2222222222222222222222222222222222222222";

    const firstId = await submitAmbassadorAddress(customer.id, firstAddress);
    expect(firstId).toBeTruthy();

    await expect(submitAmbassadorAddress(customer.id, secondAddress)).rejects.toMatchObject({ code: "CONFLICT" });
    const verified = await db.query<{ status: string; verifiedBy: string | null }>(
      `select status,verified_by as "verifiedBy" from ambassador_wallet_addresses where id=$1`, [firstId]);
    expect(verified.rows[0]).toEqual({ status: "verified", verifiedBy: null });
  });

  it("allows a corrected address after rejection and preserves the rejected record", async () => {
    const db = await getDb();
    const customer = await createTestUser("walletreject");
    const admin = await createTestUser("walletrejectadmin");
    await db.query(`update profiles set role='admin' where id=$1`, [admin.id]);
    const rejectedAddress = "0x3333333333333333333333333333333333333333";
    const replacementAddress = "0x4444444444444444444444444444444444444444";
    const firstId = await submitAmbassadorAddress(customer.id, rejectedAddress);
    await db.query(`update ambassador_wallet_addresses set status='rejected', rejection_reason='Replaced for test' where id=$1`, [firstId]);
    const replacementId = await submitAmbassadorAddress(customer.id, replacementAddress);
    const rows = await db.query<{ id: string; status: string; address: string }>(
      `select id,status,address from ambassador_wallet_addresses where user_id=$1 order by created_at`, [customer.id]);
    expect(rows.rows).toEqual([
      { id: firstId, status: "rejected", address: rejectedAddress },
      { id: replacementId, status: "verified", address: replacementAddress },
    ]);
  });

  it("prevents an admin from approving their own wallet address", async () => {
    const db = await getDb();
    const admin = await createTestUser("walletself");
    await db.query(`update profiles set role='super_admin' where id=$1`, [admin.id]);
    const id = await submitAmbassadorAddress(admin.id, "0x5555555555555555555555555555555555555555");
    const row = await db.query<{ status: string }>(`select status from ambassador_wallet_addresses where id=$1`, [id]);
    expect(row.rows[0]?.status).toBe("verified");
  });
});
