import Link from "next/link";
import { BadgeDollarSign, Gift, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
import { requireUserPage } from "@/server/auth/guards";
import { getReferralDashboard } from "@/server/data/customer";
import { getAmbassadorDashboard } from "@/server/services/ambassador";
import { getUsdRewardsDashboard } from "@/server/services/campaigns";
import { getAppUrl } from "@/lib/config";
import { formatDate } from "@/lib/utils";
import { ShareReferral } from "@/components/campaigns/share-referral";
import { AmbassadorPanel } from "@/components/ambassador/ambassador-panel";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await requireUserPage();
  const [data, ambassador, rewards] = await Promise.all([
    getReferralDashboard(user.id),
    getAmbassadorDashboard(user.id),
    getUsdRewardsDashboard(user.id),
  ]);
  const link = `${getAppUrl()}/register?ref=${encodeURIComponent(data.code)}`;

  return (
    <div>
      <PageHeader
        eyebrow="Referral programme"
        title="Your $3 referral programme."
        description="Share your link and earn $3 USD for every valid referral. This page tracks only the normal BUYBIZ referral programme."
      />

      <>
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="relative overflow-hidden rounded-[16px] bg-[#0A0B0D] p-5 text-white">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">Your referral code</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="font-mono text-[27px] font-semibold tracking-[0.08em]">{data.code || "Not ready"}</p>
                {data.code ? <CopyButton value={data.code} label="Copy code" /> : null}
              </div>
              <p className="mt-5 text-[10px] text-white/40">Your invite link</p>
              <p className="mt-1.5 w-full break-all rounded-[8px] border border-white/10 bg-white/[0.05] px-3 py-2.5 font-mono text-[10px] leading-4 text-white/70">{link}</p>
              <div className="mt-2 w-full">
                <ShareReferral value={link} />
              </div>
              <p className="mt-4 text-[9.5px] leading-4 text-white/55">To qualify for this referral reward, you must successfully purchase a proxy subscription of at least {data.minProxyDays} days.</p>
            </section>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Total referrals", value: data.stats.total, icon: Users },
                { label: "Valid referrals", value: data.stats.rewarded + data.stats.qualified, icon: Gift },
                { label: "Pending", value: ambassador.pending, icon: Gift },
                { label: "Invalid", value: data.stats.rejected, icon: Gift },
                { label: "USD earned", value: `$${(ambassador.earnedCents / 100).toFixed(2)}`, icon: BadgeDollarSign },
                { label: "USD available", value: `$${(ambassador.availableCents / 100).toFixed(2)}`, icon: BadgeDollarSign },
                { label: "USD pending", value: `$${(rewards.ambassador.pendingCents / 100).toFixed(2)}`, icon: BadgeDollarSign },
                { label: "USD paid", value: `$${(rewards.ambassador.paidCents / 100).toFixed(2)}`, icon: BadgeDollarSign },
              ].map((item) => (
                <div key={item.label} className="surface-card rounded-[12px] p-3.5">
                  <div className="flex items-center justify-between"><p className="text-[9.5px] text-muted-foreground">{item.label}</p><item.icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  <p className="tabular mt-2 text-[18px] font-semibold leading-none">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3"><AmbassadorPanel isAmbassador={ambassador.isAmbassador} qualified={ambassador.qualified} required={ambassador.config.referralsRequired} total={ambassador.total} pending={ambassador.pending} rejected={ambassador.rejected} availableCents={ambassador.availableCents} earnedCents={ambassador.earnedCents} minWithdrawalCents={ambassador.config.withdrawalMinCents} commissionCents={ambassador.config.commissionCents} address={ambassador.address} openWithdrawal={ambassador.openWithdrawal} withdrawals={ambassador.withdrawals} promotedAt={ambassador.promotedAt} nextPayoutAt={ambassador.config.nextPayoutAt} minProxyDays={data.minProxyDays} /></div>

          <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div><h2 className="text-[12px] font-semibold">Your referrals</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Purchase a qualifying proxy subscription to unlock referral rewards.</p></div>
              <Link href="/marketplace" className="text-[9.5px] text-muted-foreground hover:text-foreground">Marketplace</Link>
            </div>
            {data.referrals.length === 0 ? (
              <EmptyState icon={Gift} title="No referrals yet" description={`Share your code with someone who has not opened a BUYBIZ account. Your $3 USD reward appears after their qualifying ${data.minProxyDays}-day+ proxy purchase is verified.`} />
            ) : (
              <div className="divide-y divide-border">
                {data.referrals.map((referral) => (
                  <div key={referral.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div><p className="text-[11px] font-medium">@{referral.refereeUsername}</p><p className="mt-0.5 text-[9px] text-muted-foreground">Joined {formatDate(referral.createdAt)}</p></div>
                    <div className="text-right">
                      {referral.status === "rewarded" ? (<><Badge tone="success">$3 USD earned</Badge><p className="mt-1 text-[8.5px] text-muted-foreground">{referral.rewardedAt ? formatDate(referral.rewardedAt) : ""}</p>{referral.ambassadorQualifiedAt ? <p className="mt-1 text-[8px] text-success">Ambassador task complete</p> : null}</>) : referral.status === "qualified" ? (<Badge tone="info">Qualifying purchase complete</Badge>) : referral.status === "pending" ? (<><Badge tone="warning">{`Purchase ${data.minProxyDays} days+ to unlock`}</Badge><p className="mt-1 text-[8px] text-muted-foreground">Purchase required</p></>) : referral.status === "registered" ? (<Badge tone="neutral">Registered · purchase required</Badge>) : (<Badge tone="danger">Rejected</Badge>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="mt-3 grid gap-2 text-[10px] leading-5 text-muted-foreground sm:grid-cols-3">
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3">One referral per new customer. There is no cap on valid referrals or $3 USD rewards.</p>
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3">Eligibility is based on a successful proxy purchase of {data.minProxyDays} days or more. Wallet deposits alone do not qualify; failed or refunded purchases do not count. Each valid referral earns $3 USD.</p>
            <p className="rounded-[9px] border border-border bg-surface-subtle p-3">Self-referrals, duplicate accounts and code abuse are rejected. BUYBIZ may review or reverse rewards tied to abuse.</p>
          </div>
        </>
    </div>
  );
}
