import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Verified session status for public marketing chrome. The marketing page is
 * rendered without a Supabase round-trip; this endpoint is fetched after paint
 * and never grants access to protected data by itself.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(
      { authenticated: Boolean(user) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
