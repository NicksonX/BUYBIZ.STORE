import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MailCheck, ShieldAlert } from "lucide-react";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { verifyEmailDemoAction } from "@/server/actions/auth";
import { isDemoMode } from "@/lib/config";
import { isEmailConfigured } from "@/lib/email/config";
import { OtpForm } from "@/components/auth/otp-form";
import { safeNextPath } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { homeForProfile } from "@/server/auth/landing";

export const metadata: Metadata = { title: "Verify your email" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const demo = isDemoMode();
  const emailConfigured = isEmailConfigured();
  const email = first(params.email) || user?.email;
  const next = safeNextPath(first(params.next), user ? homeForProfile(user) : "/dashboard");
  const verified = Boolean(user?.emailVerified);

  return (
    <div>
      <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-black/[0.07] bg-white text-[#0A0B0D] shadow-xs">
        {verified ? (
          <BadgeCheck className="h-5 w-5 text-[#16794A]" />
        ) : user ? (
          <MailCheck className="h-5 w-5" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-[#946200]" />
        )}
      </span>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A0B0D]/35">
        {verified ? "Email verified" : "Email verification"}
      </p>
      <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">
        {verified
          ? "You're ready to go."
          : user
            ? "Verify your email to buy."
            : "Check your inbox."}
      </h1>
      <p className="mt-3 text-[12.5px] leading-6 text-[#0A0B0D]/50">
        {verified
          ? "Your email address is confirmed. Purchases, deposits and support are now available."
          : emailConfigured
            ? `Enter the 6-digit code sent to ${email ?? "your email address"}. It expires after 10 minutes. Verifying unlocks purchases and wallet deposits.`
            : user
              ? `Confirm ${email ?? "your email address"} to make purchases and wallet deposits. You can still explore the marketplace while unverified.`
              : `If ${email ?? "that email"} is registered, a verification link is on its way. Verify it, then sign in to continue.`}
      </p>

      <div className="mt-6 space-y-3">
        {verified ? (
          <Link
            href={next}
            className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white hover:bg-[#1A1C1F]"
          >
            Continue to BUYBIZ
          </Link>
        ) : demo && user ? (
          <form action={verifyEmailDemoAction}>
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-[#0A0B0D] text-[12.5px] font-semibold text-white hover:bg-[#1A1C1F]"
            >
              Verify email (demo)
            </button>
          </form>
        ) : null}

        {!verified && emailConfigured && email ? (
          <div className="rounded-[11px] border border-[#0A0B0D]/[0.08] bg-white p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#0A0B0D]/35">
              Verify with your code
            </p>
            <OtpForm email={email} next={next} />
          </div>
        ) : null}

        {!verified ? (
          <ResendVerificationForm email={email} demoMode={demo} />
        ) : null}

        {user ? (
          <Link
            href="/dashboard"
            className="inline-flex h-10 w-full items-center justify-center rounded-[10px] border border-black/[0.09] bg-white text-[11.5px] font-medium text-[#0A0B0D] hover:bg-[#FAFAFA]"
          >
            Go to dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-10 w-full items-center justify-center rounded-[10px] border border-black/[0.09] bg-white text-[11.5px] font-medium text-[#0A0B0D] hover:bg-[#FAFAFA]"
          >
            Back to sign in
          </Link>
        )}
      </div>

      <p className="mt-5 text-[9.5px] leading-4 text-[#0A0B0D]/35">
        Email verification is required before purchasing proxy access or funding
        a wallet. Codes and links expire; request a new one if needed.
      </p>
    </div>
  );
}
