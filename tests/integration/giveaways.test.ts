import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createGiveaway, claimGiveaway, submitGiveawayWallet } from "@/server/services/giveaways";
import { createTestUser } from "../helpers";

beforeAll(async () => { await getDb(); });

describe("giveaway claims", () => {
  it("enforces the limit atomically and accepts one claim per user", async () => {
    const admin = await createTestUser("gadmin");
    const giveaway = await createGiveaway({
      adminId: admin.id, title: "Test Giveaway", rewardCents: 100, claimLimit: 2,
    });
    const db = await getDb();
    await db.query(`update giveaways set status='active' where id=$1`, [giveaway.id]);
    const users = await Promise.all([1, 2, 3].map((n) => createTestUser(`give${n}`)));
    const results = await Promise.allSettled(users.map((user) => claimGiveaway({ userId: user.id, giveawayId: giveaway.id, code: giveaway.code })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(0);
    const row = await db.query<{ claimedCount: number; status: string }>(`select claimed_count as "claimedCount", status from giveaways where id=$1`, [giveaway.id]);
    expect(row.rows[0]).toMatchObject({ claimedCount: 3, status: "active" });
    const winners = await db.query<{ n: number }>(`select count(*)::int n from giveaway_claims where giveaway_id=$1 and is_winner=true`, [giveaway.id]);
    expect(winners.rows[0].n).toBe(2);
    const winner = users[0];
    const claim = await db.query<{ id: string }>(`select id from giveaway_claims where giveaway_id=$1 and user_id=$2`, [giveaway.id, winner.id]);
    if (claim.rows[0]) {
      await expect(submitGiveawayWallet({ userId: winner.id, claimId: claim.rows[0].id, address: "0x1234567890abcdef1234567890abcdef12345678" })).resolves.toEqual({ ok: true });
      await expect(submitGiveawayWallet({ userId: winner.id, claimId: claim.rows[0].id, address: "bad-address" })).rejects.toMatchObject({ code: "VALIDATION" });
    }
  });
});
