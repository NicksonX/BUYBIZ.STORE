import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getTrustedOrigin } from "@/lib/http";
import { createSupabaseCallbackClient } from "@/lib/supabase/route-client";
import { safeNextPath } from "@/lib/utils";
import { queueWelcomeEmail, flushEmailQueue } from "@/server/services/email";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: EmailOtpType[] = [
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
  "email",
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = getTrustedOrigin(request);
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const type = ALLOWED_TYPES.find((allowed) => allowed === rawType);
  const next = safeNextPath(
    url.searchParams.get("next"),
    type === "recovery" ? "/reset-password" : "/dashboard",
  );

  if (process.env.DEMO_MODE === "true") {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const callback = createSupabaseCallbackClient(request);
  if (!callback) {
    return NextResponse.redirect(
      new URL("/login?error=auth_not_configured", origin),
    );
  }

  if (tokenHash && type) {
    const { data, error } = await callback.client.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error && data.user && type === "signup") {
      try {
        const db = await getDb();
        await db.query(
          `update profiles set email_verified=true, updated_at=now()
            where id=$1 and email_verified=false`,
          [data.user.id],
        );
        await queueWelcomeEmail(data.user.id);
        await flushEmailQueue(5);
      } catch (welcomeError) {
        console.error("[buybiz/auth] welcome email failed", welcomeError);
      }
    }
    if (error) {
      return callback.apply(
        NextResponse.redirect(new URL("/login?error=link_invalid", origin)),
      );
    }
    return callback.apply(NextResponse.redirect(new URL(next, origin)));
  }

  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await callback.client.auth.exchangeCodeForSession(code);
    if (error) {
      return callback.apply(
        NextResponse.redirect(new URL("/login?error=link_invalid", origin)),
      );
    }
    return callback.apply(NextResponse.redirect(new URL(next, origin)));
  }

  return NextResponse.redirect(new URL("/login?error=link_invalid", origin));
}
