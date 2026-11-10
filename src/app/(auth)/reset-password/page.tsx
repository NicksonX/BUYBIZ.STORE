import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { isDemoMode } from "@/lib/config";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = first(params.token);
  const demo = isDemoMode();
  const user = demo ? null : await getCurrentUser();
  const canReset = demo ? Boolean(token) : Boolean(user);

  return <ResetPasswordForm token={token} canReset={canReset} />;
}
