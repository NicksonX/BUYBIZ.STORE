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
import { getAppUrl } from "@/lib/config";
import { formatDate, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const user = await requireUserPage();
  const [data, ambassador] = await Promise.all([
    getReferralDashboard(user.id),
    getAmbassadorDashboard(user.id),
  ]);
  const link = `${getAppUrl()}/register?ref=${encodeURIComponent(data.code)}`;

  return (
    <div>
      <PageHeader
        eyebrow="Referrals"
        title="Invite someone. Earn ₦1,000 and unlock Ambassador."
        description="When a new customer makes a qualifying deposit of at least ₦3,000, you get 1,000 BUYBIZ credits. After 10 qualified referrals you become an Ambassador and earn USD commissions, separate from your naira wallet."
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden rounded-[16px] bg-[#0A0B0D] p-5 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
            Your referral code
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="font-mono text-[27px] font-semibold tracking-[0.08em]">
              {data.code || "Not ready"}
            </p>
            {data.code ? <CopyButton value={data.code} label="Copy code" /> : null}
          </div>
          <p className="mt-5 text-[10px] text-white/40">Your invite link</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate rounded-[7px] border border-white/10 bg-white/[0.05] px-3 py-2.5 font-mono text-[10px] text-white/70">
              {link}
            </p>
            <CopyButton value={link} label="Copy link" />
          </div>
          <p className="mt-4 text-[9.5px] leading-4 text-white/35">
            Rewards are internal wallet credit for BUYBIZ purchases. They are not
            cash withdrawals. Referral credit from another user never counts
            toward the ₦3,000 deposit requirement.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "People referred", value: data.stats.total, icon: Users },
            { label: "Pending", value: data.stats.pending, icon: Gift },
            { label: "Rewarded", value: data.stats.rewarded, icon: Gift },
            { label: "Earned", value: formatNaira(data.stats.earnedMinor), icon: Wallet },
          ].map((item) => (
            <div key={item.label} className="surface-card rounded-[12px] p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[9.5px] text-muted-foreground">{item.label}</p>
                <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="tabular mt-2 text-[18px] font-semibold leading-none">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <AmbassadorPanel
        isAmbassador={ambassador.isAmbassador}
        qualified={ambassador.qualified}
        required={ambassador.config.referralsRequired}
        total={ambassador.total}
        availableCents={ambassador.availableCents}
        earnedCents={ambassador.earnedCents}
        minWithdrawalCents={ambassador.config.withdrawalMinCents}
        commissionCents={ambassador.config.commissionCents}
        address={ambassador.address}
        openWithdrawal={ambassador.openWithdrawal}
        withdrawals={ambassador.withdrawals}
        promotedAt={ambassador.promotedAt}
      />

      <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-[12px] font-semibold">Your referrals</h2>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              The first qualifying external deposit unlocks the reward.
            </p>
          </div>
          <Link href="/dashboard/wallet" className="text-[9.5px] text-muted-foreground hover:text-foreground">
            Wallet
          </Link>
        </div>
        {data.referrals.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No referrals yet"
            description="Share your code with someone who has not opened a BUYBIZ account. Your first reward appears here after their qualifying deposit is verified."
          />
        ) : (
          <div className="divide-y divide-border">
            {data.referrals.map((referral) => (
              <div key={referral.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium">@{referral.refereeUsername}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    Joined {formatDate(referral.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  {referral.status === "rewarded" ? (
                    <>
                      <Badge tone="success">1,000 credits earned</Badge>
                      <p className="mt-1 text-[8.5px] text-muted-foreground">
                        {referral.rewardedAt ? formatDate(referral.rewardedAt) : ""}
                      </p>
                      {referral.ambassadorQualifiedAt ? (
                        <p className="mt-1 text-[8px] text-success">Ambassador task complete</p>
                      ) : null}
                    </>
                  ) : referral.status === "pending" ? (
                    <Badge tone="warning">Waiting for ₦3,000 deposit</Badge>
                  ) : (
                    <Badge tone="neutral">Not eligible</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-3 grid gap-2 text-[10px] leading-5 text-muted-foreground sm:grid-cols-3">
        <p className="rounded-[9px] border border-border bg-surface-subtle p-3">
          One referral per new customer, and one reward per referred account.
        </p>
        <p className="rounded-[9px] border border-border bg-surface-subtle p-3">
          The qualifying deposit must be a single verified Paystack deposit of
          ₦3,000 or more. Internal transfers, refunds and admin credits do not count.
        </p>
        <p className="rounded-[9px] border border-border bg-surface-subtle p-3">
          Self-referrals, duplicate accounts and code abuse are rejected. BUYBIZ
          may review or reverse rewards tied to abuse.
        </p>
      </div>
    </div>
  );
}
