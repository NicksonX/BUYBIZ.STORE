import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { autoRespondToAwaitingTickets } from "@/server/services/support-automation";

export const dynamic = "force-dynamic";
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
  return isDemoMode() && process.env.NODE_ENV !== "production";
}
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await autoRespondToAwaitingTickets(30)) }, { headers: { "Cache-Control": "no-store" } });
}
