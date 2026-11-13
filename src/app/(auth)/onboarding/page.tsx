import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Welcome to BUYBIZ" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  if (user.onboardingComplete) redirect(user.role === "customer" ? "/dashboard" : "/admin");

  const needsUsername = /^user_[a-f0-9]{10}$/i.test(user.username);

  return (
    <OnboardingForm
      currentUsername={user.username}
      needsUsername={needsUsername}
      initialUseCase={user.proxyUseCase}
      next={first(params.next)}
    />
  );
}
