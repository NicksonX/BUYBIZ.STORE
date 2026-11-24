import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { getDb } from "@/lib/db";
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
    // Enforce entitlement expiry even if a customer is idle. Access is also
    // checked at read time, but this keeps allocation status honest.
    const db = await getDb();
    const expired = await db.query(`update proxy_allocations
        set status='expired', ended_at=now()
      where status='active' and expires_at<=now()
      returning id`);
    const result = await runProxyExpiryReminders();
    const queue = await processEmailQueue({ limit: 50 });
    return NextResponse.json({ ok: true, expiredAllocations: expired.rowCount ?? 0, ...result, queue }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[buybiz/cron] proxy expiry reminders failed", error);
    return NextResponse.json({ ok: false, message: "Reminder job failed." }, { status: 500 });
  }
}
