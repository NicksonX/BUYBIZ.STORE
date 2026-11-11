import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/server/services/audit";
import {
  detectSensitiveSupportRequest,
  PUBLIC_SUPPORT_KNOWLEDGE,
  SUPPORT_SYSTEM_PROMPT,
} from "@/lib/ai/support";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Please sign in first." }, { status: 401 });
  }

  const limit = await rateLimit({
    action: "ai:support:user",
    identifier: user.id,
    limit: 20,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { message: "You have reached the assistant limit. Open a support ticket and a person will help." },
      { status: 429 },
    );
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Send a valid message." }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1200) : "";
  if (message.length < 2) {
    return NextResponse.json({ message: "Type a question first." }, { status: 400 });
  }

  const meta = await getRequestMeta();
  if (detectSensitiveSupportRequest(message)) {
    const db = await getDb();
    await db.transaction((tx) =>
      writeAuditLog(tx, {
        actorUserId: user.id,
        actorRole: "customer",
        action: "ai.support_security_flag",
        entityType: "user",
        entityId: user.id,
        metadata: { reason: "sensitive_or_prompt_injection_attempt" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      }),
    );
    return NextResponse.json({
      flagged: true,
      reply:
        "I can't share private business information or bypass BUYBIZ rules. I have not changed your account. This chat will be reviewed by a person, and you can open a support ticket if you need help with a specific account issue.",
    });
  }

  const apiKey = process.env.AI_SUPPORT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        unavailable: true,
        message:
          "The AI assistant is not connected yet. Open a support ticket and a human will reply.",
      },
      { status: 503 },
    );
  }

  const baseUrl = (process.env.AI_SUPPORT_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_SUPPORT_MODEL || "gpt-4o-mini";
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is { role: "user" | "assistant"; content: string } =>
            typeof item === "object" &&
            item !== null &&
            (("role" in item && (item.role === "user" || item.role === "assistant")) as boolean) &&
            "content" in item &&
            typeof item.content === "string",
        )
        .slice(-6)
        .map((item) => ({ role: item.role, content: item.content.slice(0, 800) }))
    : [];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: `${SUPPORT_SYSTEM_PROMPT}\n\nPUBLIC KNOWLEDGE:\n${PUBLIC_SUPPORT_KNOWLEDGE}`,
          },
          ...history,
          { role: "user", content: message },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { message: "The assistant is temporarily unavailable. Please open a support ticket." },
        { status: 502 },
      );
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = payload.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json(
        { message: "The assistant did not return a reply. Please open a support ticket." },
        { status: 502 },
      );
    }
    return NextResponse.json({ reply: reply.slice(0, 2500), flagged: false });
  } catch (error) {
    console.error("[buybiz/ai] support request failed", (error as Error).message);
    return NextResponse.json(
      { message: "The assistant is temporarily unavailable. Please open a support ticket." },
      { status: 502 },
    );
  }
}
