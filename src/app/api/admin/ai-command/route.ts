import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/lib/db";
import { getTreasuryOverview, readTreasuryBalance } from "@/server/services/treasury";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function context() {
  const db = await getDb();
  const [treasury, balance, giveaways, claims, pending] = await Promise.all([
    getTreasuryOverview(),
    readTreasuryBalance(),
    db.query<{ title: string; status: string; claimed: number; limit: number }>(`select title,status,claimed_count as claimed,claim_limit as limit from giveaways order by created_at desc limit 20`),
    db.query<{ n: number }>(`select count(*)::int n from giveaway_claims`),
    db.query<{ n: number }>(`select count(*)::int n from giveaway_claims where payment_status <> 'paid'`),
  ]);
  return {
    treasury: { configured: Boolean(treasury.wallet), balance, batches: treasury.batches.length },
    giveaways: giveaways.rows,
    claims: claims.rows[0]?.n ?? 0,
    unpaidClaims: pending.rows[0]?.n ?? 0,
  };
}

function deterministic(command: string, data: Awaited<ReturnType<typeof context>>) {
  const text = command.toLowerCase();
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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !["admin", "super_admin"].includes(user.role)) return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  let command = "";
  try { command = String(((await request.json()) as { command?: unknown }).command ?? "").trim().slice(0, 1200); } catch { /* invalid */ }
  if (command.length < 2) return NextResponse.json({ message: "Type a command." }, { status: 400 });
  const data = await context();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  let reply: string;
  let mode = "deterministic";
  if (apiKey) {
    try {
      const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `You are the BUYBIZ AI Command Centre. Read-only operational assistant. Never claim an action was performed. Never request or reveal secrets, keys, seed phrases, passwords or full customer addresses. Use this live context: ${JSON.stringify(data)}. Admin command: ${command}` }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 400 } }),
        signal: AbortSignal.timeout(12_000),
      });
      const json = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || deterministic(command, data);
      mode = "gemini";
    } catch { reply = deterministic(command, data); }
  } else reply = deterministic(command, data);
  const db = await getDb();
  await db.query(`insert into ai_admin_actions (user_id,command,mode,response) values ($1,$2,$3,$4)`, [user.id, command, mode, reply]);
  return NextResponse.json({ reply, mode, data: { treasury: data.treasury.balance, claims: data.claims, unpaidClaims: data.unpaidClaims } });
}
