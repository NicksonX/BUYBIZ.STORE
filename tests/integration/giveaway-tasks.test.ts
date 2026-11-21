import { beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/lib/db";
import { createGiveaway, completeGiveawayTask } from "@/server/services/giveaways";
import { createTestUser } from "../helpers";

beforeAll(async () => { await getDb(); });

describe("giveaway social tasks", () => {
  it("hides tasks before start and persists self-reported completions once", async () => {
    const db = await getDb();
    const admin = await createTestUser("taskadmin");
    const user = await createTestUser("taskuser");
    const giveaway = await createGiveaway({ adminId: admin.id, title: "Task giveaway", rewardCents: 100, claimLimit: 20 });
    await db.query(`update giveaways set status='active', starts_at=now()+interval '1 hour', ends_at=now()+interval '2 hours' where id=$1`, [giveaway.id]);
    await expect(completeGiveawayTask({ userId: user.id, giveawayId: giveaway.id, taskKey: "follow_x" })).rejects.toMatchObject({ code: "CONFLICT" });
    await db.query(`update giveaways set starts_at=now()-interval '1 minute', ends_at=now()+interval '1 hour', x_post_url='https://x.com/buybiz_company/status/123' where id=$1`, [giveaway.id]);
    await expect(completeGiveawayTask({ userId: user.id, giveawayId: giveaway.id, taskKey: "follow_x" })).resolves.toMatchObject({ verificationMethod: "self_reported" });
    await expect(completeGiveawayTask({ userId: user.id, giveawayId: giveaway.id, taskKey: "follow_x" })).resolves.toMatchObject({ verificationMethod: "self_reported" });
    await expect(completeGiveawayTask({ userId: user.id, giveawayId: giveaway.id, taskKey: "repost_quote" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(completeGiveawayTask({ userId: user.id, giveawayId: giveaway.id, taskKey: "repost_quote", reposted: true, quoted: true })).resolves.toMatchObject({ completed: true });
    const rows = await db.query<{ n: number }>(`select count(*)::int n from giveaway_task_completions where giveaway_id=$1 and user_id=$2`, [giveaway.id, user.id]);
    expect(rows.rows[0].n).toBe(2);
  });
});
