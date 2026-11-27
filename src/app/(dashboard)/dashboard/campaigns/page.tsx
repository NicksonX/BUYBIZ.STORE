import Link from "next/link";
import { ArrowUpRight, CalendarDays, Gift, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserPage } from "@/server/auth/guards";
import { campaignPhase, formatCampaignDate, getPublishedCampaigns } from "@/server/services/campaigns";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const phaseMeta = {
  upcoming: { label: "Upcoming", tone: "border-warning/25 bg-warning-soft text-warning" },
  active: { label: "Active", tone: "border-success/25 bg-success-soft text-success" },
  ended: { label: "Ended", tone: "border-border bg-surface-subtle text-muted-foreground" },
  paused: { label: "Paused", tone: "border-warning/25 bg-warning-soft text-warning" },
  draft: { label: "Draft", tone: "border-border bg-surface-subtle text-muted-foreground" },
} as const;

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default async function CampaignsPage() {
  await requireUserPage();
  const campaigns = await getPublishedCampaigns();
  const db = await getDb();
  const referralSettings = await db.query<{ enabled:boolean; reward:number; deposit:number; duration:number }>(
    `select coalesce((select value from app_settings where key='referral_enabled'),'false'::jsonb)::boolean as enabled,
            coalesce((select value from app_settings where key='referral_reward_minor'),'100000'::jsonb)::int as reward,
            coalesce((select value from app_settings where key='referral_qualifying_deposit_minor'),'200000'::jsonb)::int as deposit,
            coalesce((select value from app_settings where key='referral_qualifying_proxy_duration_seconds'),'604800'::jsonb)::int as duration`,
  );
  const referral = referralSettings.rows[0];

  return (
    <div>
      <PageHeader
        eyebrow="Campaigns"
        title="Offers worth showing up for."
        description="Separate promotional campaigns with their own dates, rewards and eligibility. Campaign rewards never mix with normal referral rewards."
      />

      {campaigns.length === 0 ? (
        <section className="surface-card mt-4 rounded-[16px] p-8 text-center">
          <Megaphone className="mx-auto h-7 w-7 text-muted-foreground" />
          <h2 className="mt-3 text-[14px] font-semibold">No campaigns are live right now</h2>
          <p className="mx-auto mt-1 max-w-sm text-[10px] leading-5 text-muted-foreground">New BUYBIZ campaigns will appear here when they are published. Your normal $3 referral programme is always available on the Referral page.</p>
          <Link href="/dashboard/referrals" className="mt-4 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[10px] font-semibold text-background">Go to Referral</Link>
        </section>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const phase = campaignPhase(campaign);
            const meta = phaseMeta[phase];
            return (
              <section key={campaign.id} className="surface-card overflow-hidden rounded-[16px]">
                <div className="relative overflow-hidden bg-[#0A0B0D] p-5 text-white">
                  <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/[0.06] blur-2xl" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">BUYBIZ campaign</p><h2 className="mt-2 text-[21px] font-semibold tracking-[-0.035em]">{campaign.name}</h2></div>
                    <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[8.5px] font-semibold", meta.tone)}>{meta.label}</span>
                  </div>
                  <p className="relative mt-3 max-w-lg text-[10.5px] leading-5 text-white/55">{campaign.description}</p>
                  <div className="relative mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9px] text-white/70">Customer {usd(campaign.customerRewardCents)}</span>
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9px] text-white/70">Referrer {usd(campaign.referrerRewardCents)}</span>
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[9px] text-white/70">{campaign.qualifyingProxyDays}-day+ purchase</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                    <div className="rounded-[9px] border border-border bg-surface-subtle p-2.5"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /><p className="mt-1.5 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">Campaign window</p><p className="mt-0.5 font-medium">{formatCampaignDate(campaign.startsAt)} – {formatCampaignDate(campaign.endsAt)}</p></div>
                    <div className="rounded-[9px] border border-border bg-surface-subtle p-2.5"><Gift className="h-3.5 w-3.5 text-muted-foreground" /><p className="mt-1.5 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">Scheduled payout</p><p className="mt-0.5 font-medium">{formatCampaignDate(campaign.payoutAt)}</p></div>
                  </div>
                  <Link href={`/dashboard/campaigns/${campaign.slug}`} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground text-[10.5px] font-semibold text-background">
                    View campaign <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {referral?.enabled ? <section className="surface-card mt-4 rounded-[16px] p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">BUYBIZ referral programme</p><h2 className="mt-1 text-[16px] font-semibold">Invite a friend. Earn ₦{(Number(referral.reward)/100).toLocaleString("en-NG")}.</h2><p className="mt-1 max-w-[620px] text-[10px] leading-5 text-muted-foreground">Share your BUYBIZ referral link. Your friend must make a qualifying deposit of at least ₦{(Number(referral.deposit)/100).toLocaleString("en-NG")} and complete a proxy purchase of {Math.ceil(Number(referral.duration)/86400)} days or more. This is separate from the $0.50 social task and the $10 Season of Rewards campaign.</p><Link href="/dashboard/referrals" className="mt-3 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[10px] font-semibold text-background">Open referral programme <ArrowUpRight className="ml-1 h-3 w-3" /></Link></section> : null}

      <p className="mt-4 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9.5px] leading-5 text-muted-foreground">
        Campaign eligibility and dates come from the existing campaign configuration. The normal <strong className="text-foreground">$3 referral programme</strong> remains separate and is always managed from the Referral page.
      </p>
    </div>
  );
}
