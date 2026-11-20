import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserPage } from "@/server/auth/guards";
import { getUsdRewardsDashboard } from "@/server/services/campaigns";
import { getAmbassadorDashboard } from "@/server/services/ambassador";
import { getReferralDashboard } from "@/server/data/customer";
import { getAppUrl } from "@/lib/config";
import { RewardsDashboard } from "@/components/rewards/rewards-dashboard";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const user = await requireUserPage();
  const [rewards, ambassador, referrals] = await Promise.all([
    getUsdRewardsDashboard(user.id),
    getAmbassadorDashboard(user.id),
    getReferralDashboard(user.id),
  ]);
  const referralLink = `${getAppUrl()}/register?ref=${encodeURIComponent(referrals.code)}`;

  return (
    <div>
      <PageHeader
        eyebrow="Rewards"
        title="Rewards"
        description="Track your referrals, monitor your earnings and manage your reward payouts."
        actions={<Link href="/dashboard/referrals" className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-medium hover:bg-accent">Referral programme <ArrowUpRight className="h-3 w-3" /></Link>}
      />
      <div className="mt-3.5">
        <RewardsDashboard
          referralLink={referralLink}
          referrals={{ ...referrals.stats, minProxyDays: referrals.minProxyDays }}
          ambassador={{
            isAmbassador: ambassador.isAmbassador,
            qualified: ambassador.qualified,
            total: ambassador.total,
            pending: ambassador.pending,
            rejected: ambassador.rejected,
            availableCents: ambassador.availableCents,
            earnedCents: ambassador.earnedCents,
            config: ambassador.config,
            address: ambassador.address,
            openWithdrawal: ambassador.openWithdrawal,
            withdrawals: ambassador.withdrawals,
            promotedAt: ambassador.promotedAt,
          }}
          rewards={rewards}
        />
      </div>
    </div>
  );
}
