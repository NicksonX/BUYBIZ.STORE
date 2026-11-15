import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { answerSupportQuestion } from "@/server/services/support-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  if (user.status === "frozen") {
    return NextResponse.json({ message: "This account is frozen. Reactivate it before using support." }, { status: 403 });
  }

  const db = await import("@/lib/db").then((mod) => mod.getDb());
  const setting = await db.query<{ enabled: unknown }>(
    `select value as enabled from app_settings where key='ai_support_enabled' limit 1`,
  );
  if (setting.rows[0]?.enabled === false) {
    return NextResponse.json({ message: "BUYBIZ AI Support is temporarily disabled. Open a support ticket and a human will reply." }, { status: 503 });
  }
  const limit = await rateLimit({ action: "ai:support:user", identifier: user.id, limit: 30, windowSeconds: 3600 });
  if (!limit.allowed) {
    return NextResponse.json({ message: "You have reached the assistant limit. Open a support ticket and a person will help." }, { status: 429 });
  }

  let body: { message?: unknown; conversationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Send a valid message." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1200) : "";
  if (message.length < 2) return NextResponse.json({ message: "Type a question first." }, { status: 400 });
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;

  try {
    const result = await answerSupportQuestion({ userId: user.id, message, conversationId });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[buybiz/support-ai] failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ message: "The assistant is temporarily unavailable. Please open a support ticket." }, { status: 500 });
  }
}
