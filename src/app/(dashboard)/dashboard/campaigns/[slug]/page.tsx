import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, Gift, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ShareReferral } from "@/components/campaigns/share-referral";
import { requireUserPage } from "@/server/auth/guards";
import { getCampaignBySlug, campaignPhase, formatCampaignDate, getUsdRewardsDashboard } from "@/server/services/campaigns";
import { getReferralDashboard } from "@/server/data/customer";
import { getAppUrl } from "@/lib/config";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function usd(cents: number) { return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`; }

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUserPage();
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) notFound();
  const [referral, rewards] = await Promise.all([
    getReferralDashboard(user.id),
    getUsdRewardsDashboard(user.id),
  ]);
  const rows = rewards.campaignRewards.filter((row) => row.campaignSlug === campaign.slug);
  const total = rows.length;
  const qualified = rows.filter((row) => !["pending", "void"].includes(row.status)).length;
  const pending = rows.filter((row) => row.status === "pending").length;
  const paid = rows.filter((row) => row.status === "paid").length;
  const available = rows.filter((row) => row.status === "available").length;
  const phase = campaignPhase(campaign);
  const link = `${getAppUrl()}/register?ref=${encodeURIComponent(referral.code)}&campaign=${encodeURIComponent(campaign.slug)}`;
  const canParticipate = phase === "active";

  return (
    <div>
      <PageHeader
        eyebrow="Campaigns"
        title={campaign.name}
        description="Campaign tracking is separate from your normal referral programme. Rewards and eligibility here follow this campaign only."
        actions={<Link href="/dashboard/campaigns" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-medium"><ArrowLeft className="h-3.5 w-3.5" /> All campaigns</Link>}
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="relative overflow-hidden rounded-[17px] bg-[#0A0B0D] p-5 text-white">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[#B9FF66]/10 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">Campaign reward</p><p className="tabular mt-2 text-[36px] font-semibold leading-none tracking-[-0.05em]">{usd(campaign.customerRewardCents)}</p><p className="mt-1.5 text-[9.5px] text-white/45">for the qualifying customer, plus {usd(campaign.referrerRewardCents)} for the referrer</p></div>
            <span className={cn("rounded-full border px-2.5 py-1 text-[8.5px] font-semibold", phase === "active" ? "border-[#B9FF66]/25 bg-[#B9FF66]/10 text-[#B9FF66]" : "border-white/15 bg-white/[0.06] text-white/65")}>{phase}</span>
          </div>
          <p className="relative mt-4 max-w-lg text-[10.5px] leading-5 text-white/55">{campaign.description}</p>
        </section>

        <section className="surface-card rounded-[17px] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Campaign window</p>
          <div className="mt-3 space-y-3 text-[10px]">
            <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><div><p className="text-[8.5px] text-muted-foreground">Starts</p><p className="mt-0.5 font-medium">{formatCampaignDate(campaign.startsAt)}</p></div></div>
            <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><div><p className="text-[8.5px] text-muted-foreground">Ends</p><p className="mt-0.5 font-medium">{formatCampaignDate(campaign.endsAt)}</p></div></div>
            <div className="flex items-start gap-2"><Gift className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" /><div><p className="text-[8.5px] text-muted-foreground">Payout</p><p className="mt-0.5 font-medium">{formatCampaignDate(campaign.payoutAt)}</p></div></div>
          </div>
          <p className="mt-3 text-[8.5px] text-muted-foreground">All dates use {campaign.timezone}. The admin configuration is authoritative.</p>
        </section>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Reward records", total], ["Qualified", qualified], ["Pending", pending], ["Paid", paid],
        ].map(([label,value]) => <div key={String(label)} className="surface-card rounded-[12px] p-3.5"><p className="text-[9px] text-muted-foreground">{label}</p><p className="tabular mt-2 text-[20px] font-semibold">{value}</p></div>)}
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Your campaign link</h2>
          <p className="mt-1 text-[9.5px] leading-4 text-muted-foreground">This uses your existing BUYBIZ referral attribution with this campaign attached. Only purchases made during the campaign window qualify.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate rounded-[8px] border border-border bg-surface-subtle px-3 py-2.5 font-mono text-[9.5px] text-muted-foreground">{link}</p>
            <ShareReferral value={link} />
          </div>
          <div className="mt-3 rounded-[9px] bg-surface-subtle p-3 text-[9.5px] leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">How this campaign qualifies</p>
            <p className="mt-1">The referred customer must register through your link, fund their wallet, and complete a verified proxy purchase of {campaign.qualifyingProxyDays} days or more within the campaign window. A 24-hour purchase does not qualify.</p>
            <p className="mt-1">The normal $3 referral reward is separate from this campaign and is not included in these campaign totals.</p>
          </div>
        </section>

        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Campaign eligibility</h2>
          <div className="mt-3 space-y-2.5 text-[9.5px] leading-5 text-muted-foreground">
            <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Register through a valid campaign link.</p>
            <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Fund the wallet. No fixed deposit minimum applies.</p>
            <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Complete a {campaign.qualifyingProxyDays}-day+ proxy purchase during the campaign.</p>
            <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Rewards are credited to the USD reward balance after campaign review.</p>
          </div>
          {!canParticipate ? <p className="mt-3 rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] text-warning">This campaign is {phase}. {phase === "upcoming" ? "Referral activity will only count after it starts." : "New activity is no longer being accepted."}</p> : null}
        </section>
      </div>

      <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Campaign activity</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Only campaign reward records are shown here. This is not your normal referral history.</p></div>
        {rows.length === 0 ? <div className="px-4 py-8 text-center"><Clock3 className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-[10.5px] font-medium">No campaign activity yet</p><p className="mx-auto mt-1 max-w-sm text-[9px] leading-4 text-muted-foreground">Share your campaign link. Your qualifying campaign rewards will appear here after the backend verifies the purchase.</p></div> : (
          <div className="divide-y divide-border">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><div><p className="text-[10.5px] font-medium">{row.role === "customer" ? "Qualifying customer" : `Referral: @${row.customerUsername}`}</p><p className="mt-0.5 text-[8.5px] text-muted-foreground">{formatDateTime(row.earnedAt)} · {usd(row.amountCents)}</p></div><div className="text-right"><Badge tone={row.status === "paid" ? "success" : row.status === "available" ? "info" : row.status === "pending" ? "warning" : "neutral"}>{row.status === "pending" && new Date(row.availableAt) <= new Date() ? "available" : row.status}</Badge>{row.paidAt ? <p className="mt-1 text-[8px] text-muted-foreground">Paid {formatDateTime(row.paidAt)}</p> : null}</div></div>)}</div>
        )}
      </section>
      <p className="mt-3 text-[9px] leading-5 text-muted-foreground"><ShieldCheck className="mr-1 inline h-3 w-3" /> Campaign rewards are separate from the normal $3 referral rewards. Historical records are never merged or deleted.</p>
    </div>
  );
}
