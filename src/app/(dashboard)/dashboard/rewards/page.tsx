import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserPage } from "@/server/auth/guards";
import { getFeaturedCampaign, getUsdRewardsDashboard } from "@/server/services/campaigns";
import { getAmbassadorDashboard } from "@/server/services/ambassador";
import { UsdRewardsPanel } from "@/components/referrals/usd-rewards-panel";
import { AmbassadorPanel } from "@/components/ambassador/ambassador-panel";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await requireUserPage();
  const [rewards, ambassador, campaign] = await Promise.all([
    getUsdRewardsDashboard(user.id),
    getAmbassadorDashboard(user.id),
    getFeaturedCampaign().catch(() => null),
  ]);
  const campaignPayoutAt = rewards.campaignPayoutAt ?? campaign?.payoutAt ?? null;
  return (
    <div>
      <PageHeader
        eyebrow="Rewards"
        title="Your USD rewards wallet."
        description="Separate campaign and referral rewards, one secure USDT BEP20 payout destination. USD rewards never mix with your NGN wallet."
        actions={<Link href="/dashboard/campaigns" className="inline-flex h-9 items-center rounded-full border border-border bg-surface px-3 text-[10px] font-medium">Campaigns</Link>}
      />
      <UsdRewardsPanel
        totals={rewards.totals}
        campaign={rewards.campaign}
        ambassador={rewards.ambassador}
        campaignRewards={rewards.campaignRewards}
        ambassadorCommissions={rewards.ambassadorCommissions}
        payouts={rewards.payouts}
        address={rewards.address}
        campaignPayoutAt={campaignPayoutAt}
        ambassadorNextPayoutAt={rewards.ambassadorNextPayoutAt ?? ambassador.config.nextPayoutAt}
        isAmbassador={ambassador.isAmbassador}
        payoutDateReached={Boolean(campaignPayoutAt && new Date(campaignPayoutAt).getTime() <= Date.now())}
      />
      {ambassador.isAmbassador ? (
        <AmbassadorPanel
          isAmbassador
          qualified={ambassador.qualified}
          required={ambassador.config.referralsRequired}
          total={ambassador.total}
          pending={ambassador.pending}
          rejected={ambassador.rejected}
          availableCents={ambassador.availableCents}
          earnedCents={ambassador.earnedCents}
          minWithdrawalCents={ambassador.config.withdrawalMinCents}
          commissionCents={ambassador.config.commissionCents}
          address={ambassador.address}
          openWithdrawal={ambassador.openWithdrawal}
          withdrawals={ambassador.withdrawals}
          promotedAt={ambassador.promotedAt}
          nextPayoutAt={ambassador.config.nextPayoutAt}
          minProxyDays={Math.max(1, Math.ceil(ambassador.config.qualifyingProxyDurationSeconds / 86_400))}
        />
      ) : null}
    </div>
  );
}
