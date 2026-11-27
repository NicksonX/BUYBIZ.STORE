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
  const [treasury, balance, giveaways, claims, pending, walletPending, walletRejected, latestWinners] = await Promise.all([
    getTreasuryOverview(),
    readTreasuryBalance(),
    db.query<{ title: string; status: string; claimed: number; limit: number }>(`select title,status,claimed_count as claimed,claim_limit as limit from giveaways order by created_at desc limit 20`),
    db.query<{ n: number }>(`select count(*)::int n from giveaway_claims`),
    db.query<{ n: number }>(`select count(*)::int n from giveaway_claims where payment_status <> 'paid'`),
    db.query<{ id: string; email: string; username: string; address: string; createdAt: Date }>(`select a.id,p.email,p.username,a.address,a.created_at as "createdAt" from ambassador_wallet_addresses a join profiles p on p.id=a.user_id where a.status='pending' order by a.created_at limit 100`),
    db.query<{ id: string; email: string; username: string; address: string; reason: string | null; createdAt: Date }>(`select a.id,p.email,p.username,a.address,a.rejection_reason as reason,a.created_at as "createdAt" from ambassador_wallet_addresses a join profiles p on p.id=a.user_id where a.status='rejected' order by a.created_at desc limit 50`),
    db.query<{ id: string; username: string; email: string; amount: number; paymentStatus: string; walletAddress: string | null; announcementStatus: string | null }>(
      `select c.id,p.username,p.email,c.reward_amount_usd_cents as amount,c.payment_status as "paymentStatus",c.wallet_address as "walletAddress",
              (select d.status from email_deliveries d where d.dedupe_key='giveaway_winner_announcement:'||c.id limit 1) as "announcementStatus"
         from giveaway_claims c join giveaways g on g.id=c.giveaway_id join profiles p on p.id=c.user_id
        where c.is_winner=true and g.id=(select id from giveaways order by created_at desc limit 1) order by c.winner_position asc nulls last limit 100`,
    ),
  ]);
  const tasks = await db.query<{ id:string;title:string;status:string;submissions:number;approved:number;paid:number }>(
    `select t.id,t.title,t.status,
            (select count(*)::int from featured_task_submissions s where s.task_id=t.id) as submissions,
            (select count(*)::int from featured_task_submissions s where s.task_id=t.id and s.status='approved') as approved,
            (select count(*)::int from featured_task_submissions s where s.task_id=t.id and s.status='paid') as paid
       from featured_tasks t order by t.created_at desc limit 20`,
  );
  return {
    tasks: tasks.rows,
    treasury: { configured: Boolean(treasury.wallet), balance, batches: treasury.batches.length },
    giveaways: giveaways.rows,
    claims: claims.rows[0]?.n ?? 0,
    unpaidClaims: pending.rows[0]?.n ?? 0,
    walletVerification: { pendingCount: walletPending.rows.length, pending: walletPending.rows, rejected: walletRejected.rows },
    winners: latestWinners.rows,
    winnerSummary: {
      count: latestWinners.rows.length,
      totalCents: latestWinners.rows.reduce((sum, row) => sum + Number(row.amount), 0),
      paid: latestWinners.rows.filter((row) => row.paymentStatus === "paid").length,
      awaitingPayout: latestWinners.rows.filter((row) => row.paymentStatus !== "paid").length,
      announcementSent: latestWinners.rows.filter((row) => row.announcementStatus === "sent").length,
    },
    treasuryConfigured: Boolean(treasury.wallet),
  };
}

function deterministic(command: string, data: Awaited<ReturnType<typeof context>>) {
  const text = command.toLowerCase();
  if (/task|featured/.test(text)) {
    const task = data.tasks[0];
    if (!task) return "No featured tasks exist yet.";
    return `Featured task: ${task.title} (${task.status}). ${task.submissions} submissions, ${task.approved} approved, ${task.paid} paid. The $0.50 task reward is separate from the $10 Season of Rewards campaign.`;
  }
  if (/(winner|participant)/.test(text)) {
    const summary = data.winnerSummary;
    const lines = data.winners.slice(0, 20).map((w) => `• ${w.username} (${w.email}) — ${usdForAi(w.amount)} — ${w.paymentStatus} — announcement: ${w.announcementStatus ?? "not sent"} — wallet: ${w.walletAddress ? "saved" : "missing"}`).join("\n");
    return `Latest giveaway: ${summary.count} verified winners, ${usdForAi(summary.totalCents)} total. ${summary.paid} paid, ${summary.awaitingPayout} awaiting payout, ${summary.announcementSent} winner announcements sent.\n\n${lines}\n\nWinner announcement email must be previewed and approved in Admin → Giveaways. Payout execution is blocked until a treasury signer is configured.`;
  }
  if (/(treasury|balance|payout|pay winners|fund)/.test(text)) {
    return data.treasuryConfigured ? `Treasury is configured. ${data.treasury.balance.available ? `Available ${data.treasury.balance.usdt.toFixed(4)} USDT and ${data.treasury.balance.bnb.toFixed(4)} BNB on BEP20.` : `Treasury balance unavailable: ${data.treasury.balance.error}`} Automated signing is not configured; payouts require the existing treasury signing workflow.` : "No treasury wallet is configured and no server-side signer exists. Winners can be listed and emails prepared, but no giveaway payout can be executed until the owner configures and attests the treasury wallet and authorizes a signing method.";
  }
  const walletIntent = /wallet|payout address|submitted address/.test(text);
  if (walletIntent && /rejected|failed/.test(text)) {
    const rows = data.walletVerification.rejected;
    return rows.length ? `There are ${rows.length} rejected wallet addresses:\n${rows.map((r) => `• ${r.email} — ${r.address}${r.reason ? ` — ${r.reason}` : ""}`).join("\n")}` : "There are no rejected wallet addresses.";
  }
  if (walletIntent && /pending|awaiting|submitted|verify|check|how many/.test(text)) {
    const rows = data.walletVerification.pending;
    return rows.length ? `There are ${rows.length} wallet addresses awaiting verification:\n${rows.map((r) => `• ${r.email} — ${r.address}`).join("\n")}\n\nBulk auto-verification is disabled: each address requires an explicit ownership review before verification.` : "There are no wallet addresses awaiting verification.";
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

function usdForAi(cents: number) { return `$${(Number(cents) / 100).toFixed(2)}`; }

function planAction(command: string, data: Awaited<ReturnType<typeof context>>): ActionPlan | null {
  const text = command.toLowerCase();
  if (/create|new/.test(text) && /giveaway/.test(text)) {
    const reward = Number(command.match(/\$(\d+(?:\.\d+)?)/)?.[1] ?? 1);
    const limit = Number(command.match(/(\d+)\s*(?:users?|claims?|winners?)/i)?.[1] ?? 20);
    return { type: "create_giveaway", title: "Create giveaway", details: [`Reward: $${reward.toFixed(2)} USDT`, `Maximum winners: ${limit}`, "Network: BNB Smart Chain (BEP20)", `Budget: $${(reward * limit).toFixed(2)} plus fees`], payload: { reward, limit } };
  }
  if (/(launch|activate)/.test(text) && /giveaway/.test(text)) return { type: "activate_giveaway", title: "Launch giveaway", details: ["Status will become Active", "Announcement email will be queued to verified users", "Claim limit remains enforced by the database"], payload: {} };
  if (/pause/.test(text) && /giveaway/.test(text)) return { type: "pause_giveaway", title: "Pause giveaway", details: ["New claims will be rejected", "Existing claims remain recorded"], payload: {} };
  if (/(end|close)/.test(text) && /giveaway/.test(text)) return { type: "end_giveaway", title: "End giveaway", details: ["Giveaway will stop accepting claims", "Existing claims and audit records remain"], payload: {} };
  if (/prepare/.test(text) && /task/.test(text) && /(payment|payout|batch)/.test(text)) {
    const task = data.tasks[0];
    if (!task) return null;
    return { type:"prepare_task_payouts", title:"Prepare featured task payments", details:[`Task: ${task.title}`,`Approved participants: ${task.approved}`,`Reward: $0.50 USDT each`,`Estimated total: $${(task.approved*50/100).toFixed(2)} USDT`,"Creates claims and a reviewed batch only. Does not sign or send funds."], payload:{taskId:task.id} };
  }
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
    if (plan.type !== "create_giveaway" && plan.type !== "prepare_task_payouts" && !latest.rows[0]) return NextResponse.json({ message: "No giveaway exists to operate on." }, { status: 409 });
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
