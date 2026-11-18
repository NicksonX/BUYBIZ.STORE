import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { SocialButtons } from "@/components/auth/social-buttons";
import { isDemoMode, isGoogleAuthEnabled } from "@/lib/config";
import { safeNextPath } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { homeForProfile } from "@/server/auth/landing";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = first(params.next);
  const referralCode = first(params.ref)?.trim().toUpperCase() ?? "";
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(next, homeForProfile(user)));
  const googleEnabled = isGoogleAuthEnabled() && !isDemoMode();

  return (
    <div>
      <p className="text-[11px] font-medium text-[#0A0B0D]/45">Create your account</p>
      <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D]">Start with Google.</h1>
      <p className="mt-2 text-[12.5px] leading-5 text-[#0A0B0D]/50">One secure account for proxy plans, orders, wallet and support.</p>

      {referralCode ? <div className="mt-5 rounded-[9px] border border-[#16794A]/15 bg-[#E7F6EE] px-3 py-2 text-[10.5px] leading-4 text-[#16794A]">Referral code <strong className="font-semibold">{referralCode}</strong> is applied. Reward rules apply.</div> : null}

      <div className="mt-6">
        <SocialButtons next={next} referralCode={referralCode} googleEnabled={googleEnabled} onlyGoogle />
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-[9px] border border-black/[0.07] bg-[#FAFAFA] px-3 py-2.5 text-[9.5px] leading-4 text-[#0A0B0D]/55">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Already have a BUYBIZ account with email and password? Continue with Google using that <strong className="font-semibold text-[#0A0B0D]">same email</strong> and we&apos;ll connect you to your existing account.</span>
      </div>

      <p className="mt-4 text-center text-[10px] text-[#0A0B0D]/45">By continuing, you agree to our <Link href="/terms" className="underline underline-offset-2">Terms</Link> and <Link href="/privacy" className="underline underline-offset-2">Privacy Notice</Link>.</p>
      <p className="mt-5 text-center text-[10.5px] text-[#0A0B0D]/50">Already have an account? <Link href="/login" className="font-semibold text-[#0A0B0D] underline underline-offset-2">Sign in</Link></p>
    </div>
  );
}
