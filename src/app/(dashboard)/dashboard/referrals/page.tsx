import Link from "next/link";
import { Gift, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { requireUserPage } from "@/server/auth/guards";
import { getReferralDashboard } from "@/server/data/customer";
import { getAmbassadorDashboard } from "@/server/services/ambassador";
import { AmbassadorPanel } from "@/components/ambassador/ambassador-panel";
import { AmbassadorCampaign } from "@/components/ambassador/ambassador-campaign";
import { getAppUrl } from "@/lib/config";
import { formatDate, formatNaira } from "@/lib/utils";
import { getFeaturedCampaign, getUsdRewardsDashboard } from "@/server/services/campaigns";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { ReferralTabs, type ReferralTab } from "@/components/referrals/referral-tabs";
import { UsdRewardsPanel } from "@/components/referrals/usd-rewards-panel";

export const dynamic = "force-dynamic";

function tabFrom(value: string | string[] | undefined): ReferralTab {
  const tab = Array.isArray(value) ? value[0] : value;
  return tab === "campaigns" || tab === "rewards" ? tab : "referrals";
}

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const tab = tabFrom(params.tab);
  const [data, ambassador, rewards, campaign] = await Promise.all([
    getReferralDashboard(user.id),
    getAmbassadorDashboard(user.id),
    getUsdRewardsDashboard(user.id),
    getFeaturedCampaign(),
  ]);
  const link = `${getAppUrl()}/register?ref=${encodeURIComponent(data.code)}`;

  return (
    <div>
      <PageHeader
        eyebrow="Referrals"
        title="Invite friends. Build rewards."
        description="Earn 1,000 BUYBIZ credits when a friend makes a qualifying proxy purchase. A wallet deposit alone never qualifies. Keep progressing toward Ambassador status, and see every USD campaign reward in one place."
      />

      <div className="mt-4">
        <ReferralTabs active={tab} />
      </div>

      {tab === "referrals" ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="relative overflow-hidden rounded-[16px] bg-[#0A0B0D] p-5 text-white">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">Your referral code</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="font-mono text-[27px] font-semibold tracking-[0.08em]">{data.code || "Not ready"}</p>
                {data.code ? <CopyButton value={data.code} label="Copy code" /> : null}
              </div>
              <p className="mt-5 text-[10px] text-white/40">Your invite link</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate rounded-[7px] border border-white/10 bg-white/[0.05] px-3 py-2.5 font-mono text-[10px] text-white/70">{link}</p>
                <CopyButton value={link} label="Copy link" />
              </div>
              <p className="mt-4 text-[9.5px] leading-4 text-white/55">Purchase a qualifying proxy subscription to unlock referral rewards. A single verified deposit of ₦2,000 is also required; the proxy purchase is what qualifies the referral.</p>
            </section>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "People referred", value: data.stats.total, icon: Users },
                { label: "Awaiting purchase", value: data.stats.registered + data.stats.pending, icon: Gift },
                { label: "Rewarded", value: data.stats.rewarded, icon: Gift },
                { label: "Wallet earned", value: formatNaira(data.stats.earnedMinor), icon: Wallet },
              ].map((item) => (
                <div key={item.label} className="surface-card rounded-[12px] p-3.5">
                  <div className="flex items-center justify-between"><p className="text-[9.5px] text-muted-foreground">{item.label}</p><item.icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <p className="tabular mt-2 text-[18px] font-semibold leading-none">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div><h2 className="text-[12px] font-semibold">Your referrals</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Purchase a qualifying proxy subscription to unlock referral rewards.</p></div>
              <Link href="/marketplace" className="text-[9.5px] text-muted-foreground hover:text-foreground">Marketplace</Link>
            </div>
            {data.referrals.length === 0 ? (
              <EmptyState icon={Gift} title="No referrals yet" description={`Share your code with someone who has not opened a BUYBIZ account. Your wallet reward appears after their qualifying ${data.minProxyDays}-day+ proxy purchase is verified.`} />
            ) : (
              <div className="divide-y divide-border">
                {data.referrals.map((referral) => (
                  <div key={referral.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div><p className="text-[11px] font-medium">@{referral.refereeUsername}</p><p className="mt-0.5 text-[9px] text-muted-foreground">Joined {formatDate(referral.createdAt)}</p></div>
                    <div className="text-right">
                      {referral.status === "rewarded" ? (<><Badge tone="success">1,000 credits earned</Badge><p className="mt-1 text-[8.5px] text-muted-foreground">{referral.rewardedAt ? formatDate(referral.rewardedAt) : ""}</p>{referral.ambassadorQualifiedAt ? <p className="mt-1 text-[8px] text-success">Ambassador task complete</p> : null}</>) : referral.status === "qualified" ? (<Badge tone="info">Qualifying purchase complete</Badge>) : referral.status === "pending" ? (<><Badge tone="warning">{`Purchase ${data.minProxyDays} days+ to unlock`}</Badge><p className="mt-1 text-[8px] text-muted-foreground">Deposit verified</p></>) : referral.status === "registered" ? (<Badge tone="neutral">Registered · purchase required</Badge>) : (<Badge tone="danger">Rejected</Badge>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-3 grid gap-2 text-[10px] leading-5 text-muted-foreground sm:grid-cols-3">
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3">One referral per new customer. There is no cap on qualified referrals or wallet rewards.</p>
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3">The qualifying purchase must be a completed proxy subscription of {data.minProxyDays} days or more. A single verified deposit of ₦2,000 is also required; deposits, transfers and refunds alone never qualify.</p>
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3">Self-referrals, duplicate accounts and code abuse are rejected. BUYBIZ may review or reverse rewards tied to abuse.</p>
          </div>
        </>
      ) : null}

      {tab === "campaigns" ? (
        <div className="space-y-4">
          {campaign ? <CampaignCard campaign={campaign} /> : (
            <div className="surface-card rounded-[14px] p-5 text-[10px] text-muted-foreground">No campaign is published right now.</div>
          )}
          {ambassador.config.enabled ? (
            <AmbassadorCampaign
              variant="referral"
              isAmbassador={ambassador.isAmbassador}
              qualified={ambassador.qualified}
              required={ambassador.config.referralsRequired}
              commissionCents={ambassador.config.commissionCents}
              availableCents={ambassador.availableCents}
              minWithdrawalCents={ambassador.config.withdrawalMinCents}
              nextPayoutAt={ambassador.config.nextPayoutAt}
              minProxyDays={Math.max(1, Math.ceil(ambassador.config.qualifyingProxyDurationSeconds / 86400))}
            />
          ) : null}
          {ambassador.config.nextPayoutAt ? <p className="rounded-[9px] border border-border bg-surface-subtle px-3 py-2 text-[9px] text-muted-foreground">The $3 Ambassador Programme is <strong className="font-medium text-foreground">ongoing with no end date</strong>. Its next payout batch is <strong className="font-medium text-foreground">{new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(ambassador.config.nextPayoutAt)}</strong> — a payout date, not a campaign close date. It is separate from the $10 campaign.</p> : null}
          <div className="grid gap-2 text-[10px] leading-5 text-muted-foreground sm:grid-cols-2">
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3"><strong className="text-foreground">Current campaign:</strong> both the qualifying customer and their referrer earn $10 in USD rewards. The customer must complete a proxy purchase of {data.minProxyDays} days or more during the campaign window.</p>
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3"><strong className="text-foreground">Ambassador programme:</strong> the existing separate programme pays $3 per qualified referral after 10 qualified referrals. Ambassador USD commissions never mix with campaign rewards.</p>
          </div>
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
              minProxyDays={Math.max(1, Math.ceil(ambassador.config.qualifyingProxyDurationSeconds / 86400))}
            />
          ) : null}
        </div>
      ) : null}

      {tab === "rewards" ? (
        <UsdRewardsPanel
          totals={rewards.totals}
          campaign={rewards.campaign}
          ambassador={rewards.ambassador}
          campaignRewards={rewards.campaignRewards}
          ambassadorCommissions={rewards.ambassadorCommissions}
          payouts={rewards.payouts}
          address={rewards.address}
          campaignPayoutAt={rewards.campaignPayoutAt ?? campaign?.payoutAt ?? null}
          ambassadorNextPayoutAt={rewards.ambassadorNextPayoutAt ?? ambassador.config.nextPayoutAt}
          isAmbassador={ambassador.isAmbassador}
        />
      ) : null}
    </div>
  );
}
