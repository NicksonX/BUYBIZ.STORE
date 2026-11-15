import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  const db = await getDb();
  const conversation = await db.query<{ id: string }>(
    `select id from ai_support_conversations where user_id=$1 and status <> 'closed' order by updated_at desc limit 1`,
    [user.id],
  );
  if (!conversation.rows[0]) return NextResponse.json({ conversationId: null, turns: [] });
  const messages = await db.query<{ role: string; body: string; createdAt: Date }>(
    `select role, body, created_at as "createdAt" from ai_support_messages where conversation_id=$1 order by created_at asc limit 40`,
    [conversation.rows[0].id],
  );
  return NextResponse.json({
    conversationId: conversation.rows[0].id,
    turns: messages.rows
      .filter((row) => row.role === "user" || row.role === "assistant")
      .map((row) => ({ role: row.role as "user" | "assistant", content: row.body, createdAt: row.createdAt })),
  });
}
