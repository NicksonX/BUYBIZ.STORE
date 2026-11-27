import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/lib/db";
import { createGiveaway, announceGiveaway, setGiveawayStatus } from "@/server/services/giveaways";
import { prepareGiveawayBatch } from "@/server/services/treasury";
import { prepareTaskPayouts } from "@/server/services/featured-tasks";

export const dynamic = "force-dynamic";

type Payload = { reward?: number; limit?: number; giveawayId?: string | null; taskId?: string };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ message: "Only the BUYBIZ owner can approve AI actions." }, { status: 403 });
  let actionId = "";
  try { actionId = String(((await request.json()) as { actionId?: string }).actionId ?? ""); } catch { /* invalid */ }
  if (!actionId) return NextResponse.json({ message: "Missing action." }, { status: 400 });
  const db = await getDb();
  const row = await db.query<{ id: string; actionType: string; payload: Payload; status: string }>(
    `select id,action_type as "actionType",payload,status from ai_admin_actions where id=$1 and user_id=$2 limit 1`,
    [actionId, user.id],
  );
  const action = row.rows[0];
  if (!action || action.status !== "pending_approval") return NextResponse.json({ message: "This action is no longer awaiting approval." }, { status: 409 });
  await db.query(`update ai_admin_actions set status='executing' where id=$1`, [action.id]);
  try {
    let result: Record<string, unknown> = {};
    if (action.actionType === "create_giveaway") {
      const reward = Math.max(0.01, Number(action.payload.reward ?? 1));
      const limit = Math.max(1, Math.min(10000, Number(action.payload.limit ?? 20)));
      const created = await createGiveaway({ adminId: user.id, title: "BUYBIZ $1 Giveaway", description: "Claim $1 USDT on BNB Smart Chain with the official BUYBIZ giveaway code.", rewardCents: Math.round(reward * 100), claimLimit: limit, asset: "USDT", network: "BEP20" });
      result = { giveawayId: created.id, code: created.code, status: "draft" };
    } else if (action.actionType === "activate_giveaway" && action.payload.giveawayId) {
      await setGiveawayStatus(action.payload.giveawayId, "active");
      const announcement = await announceGiveaway(action.payload.giveawayId);
      result = { status: "active", announcementEmailsQueued: announcement.queued };
    } else if (action.actionType === "pause_giveaway" && action.payload.giveawayId) {
      await setGiveawayStatus(action.payload.giveawayId, "paused"); result = { status: "paused" };
    } else if (action.actionType === "end_giveaway" && action.payload.giveawayId) {
      await setGiveawayStatus(action.payload.giveawayId, "ended"); result = { status: "ended" };
    } else if (action.actionType === "prepare_task_payouts" && action.payload.taskId) {
      const taskBatch = await prepareTaskPayouts({ taskId: action.payload.taskId, adminId: user.id });
      await prepareGiveawayBatch(taskBatch.giveawayId, user.id);
      result = taskBatch;
    } else if (action.actionType === "prepare_batch" && action.payload.giveawayId) {
      const batch = await prepareGiveawayBatch(action.payload.giveawayId, user.id); result = batch;
    } else throw new Error("Unsupported action.");
    await db.query(`update ai_admin_actions set status='completed',result=$2::jsonb,confirmed_by=$3,confirmed_at=now() where id=$1`, [action.id, JSON.stringify(result), user.id]);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    await db.query(`update ai_admin_actions set status='failed',result=$2::jsonb where id=$1`, [action.id, JSON.stringify({ error: error instanceof Error ? error.message : "Action failed" })]);
    return NextResponse.json({ message: error instanceof Error ? error.message : "Action failed." }, { status: 400 });
  }
}
