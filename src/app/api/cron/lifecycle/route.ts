import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { getDb } from "@/lib/db";
import { reconcilePendingDeposits } from "@/server/services/deposits";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    return authorization === `Bearer ${secret}` || headerSecret === secret;
  }
  // Local demo convenience only. A production deployment must set CRON_SECRET.
  return isDemoMode() && process.env.NODE_ENV !== "production";
}

/**
 * Secured lifecycle endpoint. Performs:
 *  - allocation expiry, independent of other customers;
 *  - upstream inventory interruption;
 *  - inventory status reconciliation;
 *  - server-side reconciliation of stale Paystack deposits.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  try {
    const db = await getDb();
    const result = await db.query<{ lifecycle: unknown }>(
      `select run_lifecycle_jobs() as lifecycle`,
    );
    const deposits = await reconcilePendingDeposits();
    return NextResponse.json(
      { ok: true, lifecycle: result.rows[0]?.lifecycle, deposits },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[buybiz/cron] lifecycle failed", (error as Error).message);
    return NextResponse.json(
      { ok: false, message: "Lifecycle job failed." },
      { status: 500 },
    );
  }
}
