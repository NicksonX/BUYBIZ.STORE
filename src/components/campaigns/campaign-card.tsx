import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Gift, Users } from "lucide-react";
import { campaignPhase, formatCampaignDate, type Campaign } from "@/server/services/campaigns";
import { formatNaira } from "@/lib/utils";

function reward(value: number) { return `$${(value / 100).toFixed(0)}`; }

export function CampaignCard({ campaign, compact = false }: { campaign: Campaign; compact?: boolean }) {
  const phase = campaignPhase(campaign);
  const active = phase === "active";
  const ended = phase === "ended";
  const label = active ? "Active now" : ended ? "Completed" : phase === "paused" ? "Paused" : "Coming soon";
  return (
    <section className={`relative overflow-hidden rounded-[16px] border ${active ? "border-[#ff5a36]/30 bg-[#0A0B0D] text-white" : "border-border bg-surface"}`}>
      <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full border border-current opacity-[0.06]" />
      <div className="relative p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={`flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] ${active ? "text-[#ff8b68]" : "text-muted-foreground"}`}><Gift className="h-3 w-3" /> Referral campaign</p>
            <h2 className={`mt-2 text-[19px] font-semibold tracking-[-0.035em] ${active ? "text-white" : "text-foreground"}`}>{campaign.name}</h2>
            <p className={`mt-1.5 max-w-[620px] text-[10.5px] leading-5 ${active ? "text-white/55" : "text-muted-foreground"}`}>{campaign.description}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[9px] font-medium ${active ? "border-[#ff5a36]/30 bg-[#ff5a36]/10 text-[#ffb197]" : ended ? "border-border bg-surface-subtle text-muted-foreground" : "border-warning/25 bg-warning-soft text-warning"}`}>{label}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-[430px]">
          <div className={`rounded-[10px] border p-3 ${active ? "border-white/10 bg-white/[0.05]" : "border-border bg-surface-subtle"}`}><p className={`text-[8.5px] uppercase tracking-[0.1em] ${active ? "text-white/45" : "text-muted-foreground"}`}>Customer reward</p><p className={`tabular mt-1 text-[22px] font-semibold ${active ? "text-white" : "text-foreground"}`}>{reward(campaign.customerRewardCents)}</p></div>
          <div className={`rounded-[10px] border p-3 ${active ? "border-white/10 bg-white/[0.05]" : "border-border bg-surface-subtle"}`}><p className={`text-[8.5px] uppercase tracking-[0.1em] ${active ? "text-white/45" : "text-muted-foreground"}`}>Referrer reward</p><p className={`tabular mt-1 text-[22px] font-semibold ${active ? "text-white" : "text-foreground"}`}>{reward(campaign.referrerRewardCents)}</p></div>
        </div>
        <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] ${active ? "text-white/50" : "text-muted-foreground"}`}>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatCampaignDate(campaign.startsAt)} – {formatCampaignDate(campaign.endsAt)}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {formatNaira(campaign.qualifyingDepositMinor)} deposit + eligible purchase</span>
        </div>
        {!compact ? <div className={`mt-4 flex flex-col gap-2 border-t pt-3 text-[9.5px] sm:flex-row sm:items-center sm:justify-between ${active ? "border-white/10 text-white/55" : "border-border text-muted-foreground"}`}><span className="inline-flex items-center gap-1.5"><Check className="h-3 w-3 text-success" /> Both sides are rewarded after both steps.</span><Link href={`/campaigns/${campaign.slug}`} className={`inline-flex items-center gap-1 font-medium ${active ? "text-white/80 hover:text-white" : "text-foreground hover:underline"}`}>Campaign details <ArrowUpRight className="h-3 w-3" /></Link></div> : null}
      </div>
    </section>
  );
}
