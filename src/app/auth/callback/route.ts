import { NextResponse, type NextRequest } from "next/server";
import { getTrustedOrigin } from "@/lib/http";
import { createSupabaseCallbackClient } from "@/lib/supabase/route-client";
import { safeNextPath } from "@/lib/utils";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function errorRedirect(origin: string, code: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(code)}`, origin),
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getTrustedOrigin(request);
  const next = safeNextPath(url.searchParams.get("next"), "/dashboard");
  const code = url.searchParams.get("code");
  const providerError =
    url.searchParams.get("error_description") || url.searchParams.get("error");

  if (providerError) {
    return errorRedirect(origin, "oauth_failed");
  }

  if (process.env.DEMO_MODE === "true") {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const callback = createSupabaseCallbackClient(request);
  if (!callback) return errorRedirect(origin, "auth_not_configured");

  if (code) {
    const { data, error } = await callback.client.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return callback.apply(errorRedirect(origin, "link_invalid"));
    }

    // Send OAuth users who have not chosen a username to onboarding.
    try {
      const db = await getDb();
      const profile = await db.query<{ onboardingComplete: boolean }>(
        `select onboarding_complete as "onboardingComplete" from profiles where id = $1`,
        [data.user.id],
      );
      if (profile.rows[0] && !profile.rows[0].onboardingComplete) {
        return callback.apply(
          NextResponse.redirect(new URL("/onboarding", origin)),
        );
      }
    } catch (error) {
      console.error("[buybiz/auth] callback profile check failed", error);
    }
  }

  return callback.apply(NextResponse.redirect(new URL(next, origin)));
}
