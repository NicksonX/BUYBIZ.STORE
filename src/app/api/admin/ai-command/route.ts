import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/lib/db";
import { getTreasuryOverview, readTreasuryBalance } from "@/server/services/treasury";
import { decryptSecret } from "@/lib/security/encryption";
import { createGiveaway, announceGiveaway, setGiveawayStatus } from "@/server/services/giveaways";
import { prepareGiveawayBatch } from "@/server/services/treasury";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function context() {
  const db = await getDb();
  const [treasury, balance, giveaways, claims, pending, walletPending, walletRejected] = await Promise.all([
    getTreasuryOverview(),
    readTreasuryBalance(),
    db.query<{ title: string; status: string; claimed: number; limit: number }>(`select title,status,claimed_count as claimed,claim_limit as limit from giveaways order by created_at desc limit 20`),
    db.query<{ n: number }>(`select count(*)::int n from giveaway_claims`),
    db.query<{ n: number }>(`select count(*)::int n from giveaway_claims where payment_status <> 'paid'`),
    db.query<{ id: string; email: string; username: string; address: string; createdAt: Date }>(`select a.id,p.email,p.username,a.address,a.created_at as "createdAt" from ambassador_wallet_addresses a join profiles p on p.id=a.user_id where a.status='pending' order by a.created_at limit 100`),
    db.query<{ id: string; email: string; username: string; address: string; reason: string | null; createdAt: Date }>(`select a.id,p.email,p.username,a.address,a.rejection_reason as reason,a.created_at as "createdAt" from ambassador_wallet_addresses a join profiles p on p.id=a.user_id where a.status='rejected' order by a.created_at desc limit 50`),
  ]);
  return {
    treasury: { configured: Boolean(treasury.wallet), balance, batches: treasury.batches.length },
    giveaways: giveaways.rows,
    claims: claims.rows[0]?.n ?? 0,
    unpaidClaims: pending.rows[0]?.n ?? 0,
    walletVerification: { pendingCount: walletPending.rows.length, pending: walletPending.rows, rejected: walletRejected.rows },
  };
}

function deterministic(command: string, data: Awaited<ReturnType<typeof context>>) {
  const text = command.toLowerCase();
  const walletIntent = /wallet|payout address|submitted address/.test(text);
  if (walletIntent && /rejected|failed/.test(text)) {
    const rows = data.walletVerification.rejected;
    return rows.length ? `There are ${rows.length} rejected wallet addresses:\n${rows.map((r) => `• ${r.email} — ${r.address}${r.reason ? ` — ${r.reason}` : ""}`).join("\n")}` : "There are no rejected wallet addresses.";
  }
  if (walletIntent && /pending|awaiting|submitted|verify|check|how many/.test(text)) {
    const rows = data.walletVerification.pending;
    return rows.length ? `There are ${rows.length} wallet addresses awaiting verification:\n${rows.map((r) => `• ${r.email} — ${r.address}`).join("\n")}\n\nUse “verify all pending wallet addresses” to prepare a bulk verification for owner approval.` : "There are no wallet addresses awaiting verification.";
  }
  if (text.includes("treasury") || text.includes("balance") || text.includes("usdt")) {
    return data.treasury.balance.available
      ? `Treasury: ${data.treasury.balance.usdt.toFixed(4)} USDT and ${data.treasury.balance.bnb.toFixed(4)} BNB on BEP20. Network block ${data.treasury.balance.block}. This is read from the public BSC RPC, not a cached balance.`
      : `Treasury balance is unavailable: ${data.treasury.balance.error}`;
  }
  if (text.includes("giveaway")) {
    const g = data.giveaways[0];
    return g ? `Latest giveaway: ${g.title}, status ${g.status}, ${g.claimed}/${g.limit} claims used. ${data.unpaidClaims} claims are awaiting payment confirmation.` : "No giveaways exist yet.";
  }
  if (text.includes("payment") || text.includes("unpaid")) return `${data.unpaidClaims} giveaway claims are unpaid. Payment batches must be prepared and approved on the Treasury page, then signed manually in the hardware wallet.`;
  return "I can report live treasury, giveaway, claim and payment status. Administrative writes require the corresponding BUYBIZ admin page and explicit owner action.";
}

async function geminiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  try {
    const db = await getDb();
    const row = await db.query<{ value: string }>(`select value #>> '{}' as value from app_settings where key='gemini_api_key_encrypted'`);
    return row.rows[0]?.value ? await decryptSecret(row.rows[0].value) : null;
  } catch { return null; }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  const db = await getDb();
  const history = await db.query<{ id: string; command: string; response: string; mode: string; createdAt: Date; status: string; actionType: string | null }>(
    `select id,command,response,mode,created_at as "createdAt",status,action_type as "actionType" from ai_admin_actions where user_id=$1 order by created_at desc limit 25`,
    [user.id],
  );
  const snapshot = await context();
  return NextResponse.json({ history: history.rows.reverse(), snapshot });
}

type ActionPlan = { type: string; title: string; details: string[]; payload: Record<string, unknown> };

function planAction(command: string, data: Awaited<ReturnType<typeof context>>): ActionPlan | null {
  const text = command.toLowerCase();
  if (/verify|approve/.test(text) && /(wallet|address)/.test(text) && /(all|pending|awaiting)/.test(text)) {
    return { type: "bulk_verify_wallets", title: "Verify all pending wallet addresses", details: [`${data.walletVerification.pendingCount} pending address(es) will be reviewed`, "Your own address will be skipped", "Every verified/rejected row is persisted and audited", "Invalid or already reviewed addresses are skipped"], payload: {} };
  }
  if (/create|new/.test(text) && /giveaway/.test(text)) {
    const reward = Number(command.match(/\$(\d+(?:\.\d+)?)/)?.[1] ?? 1);
    const limit = Number(command.match(/(\d+)\s*(?:users?|claims?|winners?)/i)?.[1] ?? 20);
    return { type: "create_giveaway", title: "Create giveaway", details: [`Reward: $${reward.toFixed(2)} USDT`, `Maximum winners: ${limit}`, "Network: BNB Smart Chain (BEP20)", `Budget: $${(reward * limit).toFixed(2)} plus fees`], payload: { reward, limit } };
  }
  if (/(launch|activate)/.test(text) && /giveaway/.test(text)) return { type: "activate_giveaway", title: "Launch giveaway", details: ["Status will become Active", "Announcement email will be queued to verified users", "Claim limit remains enforced by the database"], payload: {} };
  if (/pause/.test(text) && /giveaway/.test(text)) return { type: "pause_giveaway", title: "Pause giveaway", details: ["New claims will be rejected", "Existing claims remain recorded"], payload: {} };
  if (/(end|close)/.test(text) && /giveaway/.test(text)) return { type: "end_giveaway", title: "End giveaway", details: ["Giveaway will stop accepting claims", "Existing claims and audit records remain"], payload: {} };
  if (/prepare/.test(text) && /(payment|payout|batch)/.test(text)) return { type: "prepare_batch", title: "Prepare giveaway payment batch", details: ["Selects claims with submitted addresses", "Creates a batch for owner review", "No transaction is signed or sent"], payload: {} };
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  let command = "";
  try { command = String(((await request.json()) as { command?: unknown }).command ?? "").trim().slice(0, 1200); } catch { /* invalid */ }
  if (command.length < 2) return NextResponse.json({ message: "Type a command." }, { status: 400 });
  const data = await context();
  const plan = planAction(command, data);
  if (plan) {
    const db = await getDb();
    const latest = await db.query<{ id: string }>(`select id from giveaways order by created_at desc limit 1`);
    if (plan.type !== "create_giveaway" && !latest.rows[0]) return NextResponse.json({ message: "No giveaway exists to operate on." }, { status: 409 });
    const inserted = await db.query<{ id: string }>(
      `insert into ai_admin_actions (user_id,command,mode,response,action_type,status,payload) values ($1,$2,'approval',$3,$4,'pending_approval',$5::jsonb) returning id`,
      [user.id, command, plan.title, plan.type, JSON.stringify({ ...plan.payload, giveawayId: latest.rows[0]?.id ?? null })],
    );
    return NextResponse.json({ reply: `I prepared a **${plan.title}** for your approval. ${plan.details.join(". ")}. No action has been executed.`, mode: "approval", action: { id: inserted.rows[0].id, ...plan } });
  }
  const apiKey = await geminiKey();
  let reply: string;
  let mode = "deterministic";
  if (apiKey) {
    try {
      const modelSetting = await getDb().then((db) => db.query<{ value: string }>(`select value #>> '{}' as value from app_settings where key='gemini_model'`));
      const model = process.env.GEMINI_MODEL?.trim() || modelSetting.rows[0]?.value || "gemini-3.1-flash-lite";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `You are the BUYBIZ AI Command Centre. Read-only operational assistant. Never claim an action was performed. Never request or reveal secrets, keys, seed phrases, passwords or full customer addresses. Use this live context: ${JSON.stringify(data)}. Admin command: ${command}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 400 } }),
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || deterministic(command, data);
      mode = "gemini";
    } catch { reply = deterministic(command, data); }
  } else reply = deterministic(command, data);
  const db = await getDb();
  await db.query(`insert into ai_admin_actions (user_id,command,mode,response,status) values ($1,$2,$3,$4,'completed')`, [user.id, command, mode, reply]);
  return NextResponse.json({ reply, mode, data: { treasury: data.treasury.balance, claims: data.claims, unpaidClaims: data.unpaidClaims } });
}
