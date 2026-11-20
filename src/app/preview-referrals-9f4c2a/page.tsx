import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AmbassadorPanel } from "@/components/ambassador/ambassador-panel";
import { getAmbassadorDashboard } from "@/server/services/ambassador";
import { getReferralDashboard } from "@/server/data/customer";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function PreviewReferralsPage() {
  const userId = "84f5211e-81af-4444-bc1c-17c8f4f7e51a";
  const [ambassador, referrals] = await Promise.all([getAmbassadorDashboard(userId), getReferralDashboard(userId)]);
  return <div className="min-h-dvh bg-background text-foreground"><main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-6"><PageHeader eyebrow="Referral programme" title="Your $3 referral programme." description="Share your link and earn $3 USD for every valid referral. This page tracks only the normal BUYBIZ referral programme." /><div className="mt-3"><AmbassadorPanel isAmbassador={ambassador.isAmbassador} qualified={ambassador.qualified} required={ambassador.config.referralsRequired} total={ambassador.total} pending={ambassador.pending} rejected={ambassador.rejected} availableCents={ambassador.availableCents} earnedCents={ambassador.earnedCents} minWithdrawalCents={ambassador.config.withdrawalMinCents} commissionCents={ambassador.config.commissionCents} address={ambassador.address} openWithdrawal={ambassador.openWithdrawal} withdrawals={ambassador.withdrawals} promotedAt={ambassador.promotedAt} nextPayoutAt={ambassador.config.nextPayoutAt} minProxyDays={referrals.minProxyDays} /></div></main></div>;
}
