import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import {
  isAppleAuthEnabled,
  isDemoMode,
  isGoogleAuthEnabled,
} from "@/lib/config";
import { safeNextPath } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { homeForProfile } from "@/server/auth/landing";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = first(params.next);
  const referralCode = first(params.ref)?.trim().toUpperCase() ?? "";
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(next, homeForProfile(user)));

  return (
    <RegisterForm
      next={next}
      referralCode={referralCode}
      googleEnabled={isGoogleAuthEnabled()}
      appleEnabled={isAppleAuthEnabled()}
      demoMode={isDemoMode()}
    />
  );
}
