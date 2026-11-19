import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { processEmailQueue } from "@/server/services/email";
import { runDepositFollowupJobs } from "@/server/services/email-followups";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return (
      request.headers.get("authorization") === `Bearer ${secret}` ||
      request.headers.get("x-cron-secret") === secret
    );
  }
  return isDemoMode() && process.env.NODE_ENV !== "production";
}

/**
 * HTTPS email worker. Schedule this from any external HTTPS cron with
 * Authorization: Bearer CRON_SECRET. It processes queued transactional emails
 * and queues time-based deposit follow-ups. No SMTP ports are used.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  try {
    const followups = await runDepositFollowupJobs();
    const queue = await processEmailQueue({ limit: 200 });
    return NextResponse.json(
      { ok: true, followups, queue },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[buybiz/cron] email worker failed", error);
    return NextResponse.json(
      { ok: false, message: "Email worker failed." },
      { status: 500 },
    );
  }
}
