import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { runProxyExpiryReminders } from "@/server/services/proxy-expiry-reminders";
import { processEmailQueue } from "@/server/services/email";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
  return isDemoMode() && process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  try {
    const result = await runProxyExpiryReminders();
    const queue = await processEmailQueue({ limit: 50 });
    return NextResponse.json({ ok: true, ...result, queue }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[buybiz/cron] proxy expiry reminders failed", error);
    return NextResponse.json({ ok: false, message: "Reminder job failed." }, { status: 500 });
  }
}
