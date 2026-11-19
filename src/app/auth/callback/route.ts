import { NextResponse, type NextRequest } from "next/server";
import { getTrustedOrigin } from "@/lib/http";
import { createSupabaseCallbackClient } from "@/lib/supabase/route-client";
import { safeNextPath } from "@/lib/utils";
import { getDb } from "@/lib/db";
import { queueWelcomeEmail, flushEmailQueue } from "@/server/services/email";
import { attachReferralForSignup } from "@/server/services/referrals";

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
      const profile = await db.query<{ onboardingComplete: boolean; createdAt: Date }>(
        `select onboarding_complete as "onboardingComplete", created_at as "createdAt" from profiles where id = $1`,
        [data.user.id],
      );
      const queryReferral = url.searchParams.get("ref")?.trim().toUpperCase();
      const cookieReferral = request.cookies.get("buybiz_pending_referral")?.value;
      const pendingReferral = /^[A-Z0-9]{4,24}$/.test(queryReferral ?? "") ? queryReferral : cookieReferral;
      if (pendingReferral && profile.rows[0]) {
        const ageMinutes = (Date.now() - new Date(profile.rows[0].createdAt).getTime()) / 60_000;
        const existing = await db.query(`select 1 from referrals where referee_id=$1 limit 1`, [data.user.id]);
        if (ageMinutes <= 10 && !existing.rows[0]) {
          try {
            await db.transaction((tx) => attachReferralForSignup(tx, data.user!.id, pendingReferral));
          } catch (error) {
            console.error("[buybiz/auth] oauth referral attach failed", error);
          }
        }
      }
      await db.query(
        `update profiles set email_verified=true, updated_at=now()
          where id=$1 and email_verified=false`,
        [data.user.id],
      );
      await queueWelcomeEmail(data.user.id);
      await flushEmailQueue(5);
      if (profile.rows[0] && !profile.rows[0].onboardingComplete) {
        const response = NextResponse.redirect(new URL("/onboarding", origin));
        response.cookies.delete("buybiz_pending_referral");
        return callback.apply(response);
      }
    } catch (error) {
      console.error("[buybiz/auth] callback profile check failed", error);
    }
  }

  const response = NextResponse.redirect(new URL(next, origin));
  response.cookies.delete("buybiz_pending_referral");
  return callback.apply(response);
}
