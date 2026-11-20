import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { RewardsDashboard } from "@/components/rewards/rewards-dashboard";
import { getUsdRewardsDashboard } from "@/server/services/campaigns";
import { getAmbassadorDashboard } from "@/server/services/ambassador";
import { getReferralDashboard } from "@/server/data/customer";
import { getAppUrl } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewRewardsPage() {
  const userId = "84f5211e-81af-4444-bc1c-17c8f4f7e51a";
  const [rewards, ambassador, referrals] = await Promise.all([
    getUsdRewardsDashboard(userId),
    getAmbassadorDashboard(userId),
    getReferralDashboard(userId),
  ]);
  const referralLink = `${getAppUrl()}/register?ref=${encodeURIComponent(referrals.code)}`;
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-6">
        <PageHeader eyebrow="Rewards" title="Rewards" description="Track your referrals, monitor your earnings and manage your reward payouts." />
        <div className="mt-3.5">
          <RewardsDashboard
            referralLink={referralLink}
            referrals={{ ...referrals.stats, minProxyDays: referrals.minProxyDays }}
            ambassador={{
              isAmbassador: ambassador.isAmbassador, qualified: ambassador.qualified, total: ambassador.total,
              pending: ambassador.pending, rejected: ambassador.rejected, availableCents: ambassador.availableCents,
              earnedCents: ambassador.earnedCents, config: ambassador.config, address: ambassador.address,
              openWithdrawal: ambassador.openWithdrawal, withdrawals: ambassador.withdrawals, promotedAt: ambassador.promotedAt,
            }}
            rewards={rewards}
          />
        </div>
      </main>
    </div>
  );
}
