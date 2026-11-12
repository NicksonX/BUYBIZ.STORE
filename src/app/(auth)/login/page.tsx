import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import {
  isDemoMode,
  isGoogleAuthEnabled,
} from "@/lib/config";
import { safeNextPath } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { homeForProfile } from "@/server/auth/landing";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  oauth_failed: "Social sign-in was cancelled or could not be completed.",
  link_invalid:
    "That sign-in or reset link is invalid or has expired. Request a new one.",
  auth_not_configured: "Authentication is not configured for this deployment.",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = first(params.next);
  const errorCode = first(params.error);
  const user = await getCurrentUser();

  if (user) {
    redirect(
      safeNextPath(next, homeForProfile(user)),
    );
  }

  return (
    <LoginForm
      next={next}
      initialMessage={errorCode ? errorMessages[errorCode] ?? errorMessages.link_invalid : undefined}
      googleEnabled={isGoogleAuthEnabled()}
      demoMode={isDemoMode()}
    />
  );
}
