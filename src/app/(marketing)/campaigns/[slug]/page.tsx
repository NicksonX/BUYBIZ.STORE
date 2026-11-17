import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Gift, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { getCampaignBySlug } from "@/server/services/campaigns";
import { campaignPhase, formatCampaignDate } from "@/server/services/campaigns";
import { SeasonRewardsArt } from "@/components/campaigns/season-rewards-art";

export const dynamic = "force-dynamic";

async function campaign(slug: string) {
  const user = await getCurrentUser();
  const preview = ["admin", "super_admin"].includes(user?.role ?? "");
  return getCampaignBySlug(slug, preview);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await campaign(slug);
  if (!item) return { title: "Campaign" };
  return { title: item.name, description: item.description };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await campaign(slug);
  if (!item) notFound();

  return (
    <div className="bg-[#F4F4F5] py-10 text-[#0A0B0D] sm:py-16">
      <div className="mx-auto w-full max-w-[1000px] px-5 sm:px-8">
        <div className="overflow-hidden rounded-[20px]"><SeasonRewardsArt /></div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8C9097]">Referral campaign</p>
        <h1 className="mt-3 max-w-[760px] text-[36px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[56px]">{item.name}</h1>
        <p className="mt-4 max-w-[680px] text-[13px] leading-6 text-[#6E7178] sm:text-[14px]">{item.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="rounded-[11px] border border-black/[0.06] bg-white p-3"><p className="text-[8.5px] uppercase tracking-[0.1em] text-[#8C9097]">Customer</p><p className="tabular mt-1 text-[22px] font-semibold">${(item.customerRewardCents / 100).toFixed(0)}</p></div>
          <div className="rounded-[11px] border border-black/[0.06] bg-white p-3"><p className="text-[8.5px] uppercase tracking-[0.1em] text-[#8C9097]">Referrer</p><p className="tabular mt-1 text-[22px] font-semibold">${(item.referrerRewardCents / 100).toFixed(0)}</p></div>
          <div className="rounded-[11px] border border-black/[0.06] bg-white p-3"><p className="text-[8.5px] uppercase tracking-[0.1em] text-[#8C9097]">Total / referral</p><p className="tabular mt-1 text-[22px] font-semibold">${((item.customerRewardCents + item.referrerRewardCents) / 100).toFixed(0)}</p></div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[9px] text-[#8C9097]"><span className={`h-1.5 w-1.5 rounded-full ${campaignPhase(item) === "active" ? "bg-[#16794A]" : "bg-[#946200]"}`} /> {campaignPhase(item) === "active" ? "Active now" : campaignPhase(item) === "ended" ? "Completed" : "Coming soon"} · Africa/Lagos</div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[13px] border border-black/[0.06] bg-white p-4"><CalendarDays className="h-4 w-4 text-[#8C9097]" /><p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-[#8C9097]">Campaign window</p><p className="mt-1 text-[12px] font-semibold">{formatCampaignDate(item.startsAt)} – {formatCampaignDate(item.endsAt)}</p><p className="mt-1 text-[9px] text-[#6E7178]">Africa/Lagos</p></div>
          <div className="rounded-[13px] border border-black/[0.06] bg-white p-4"><Gift className="h-4 w-4 text-[#8C9097]" /><p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-[#8C9097]">Payout date</p><p className="mt-1 text-[12px] font-semibold">{formatCampaignDate(item.payoutAt)}</p><p className="mt-1 text-[9px] text-[#6E7178]">Manual USDT BEP20 review</p></div>
          <div className="rounded-[13px] border border-black/[0.06] bg-white p-4"><ShieldCheck className="h-4 w-4 text-[#8C9097]" /><p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-[#8C9097]">Qualifying purchase</p><p className="mt-1 text-[12px] font-semibold">{item.qualifyingProxyDays}-day+ proxy plan</p><p className="mt-1 text-[9px] text-[#6E7178]">A completed, paid purchase</p></div>
        </div>

        <section className="mt-8 rounded-[15px] border border-black/[0.06] bg-white p-5">
          <h2 className="text-[16px] font-semibold tracking-[-0.03em]">How to qualify</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 text-[11px] leading-5 text-[#6E7178]">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16794A]" /> Register during the campaign using a valid referral link.</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16794A]" /> Fund your wallet and purchase a proxy subscription of {item.qualifyingProxyDays} days or more.</p>
            </div>
            <div className="rounded-[10px] bg-[#F4F4F5] p-3.5 text-[10px] leading-5 text-[#6E7178]">
              <p className="font-semibold text-[#0A0B0D]">Both sides earn $10.</p>
              <p className="mt-1">The qualifying customer earns $10 and the referrer earns $10, each in their separate USD rewards balance. The 7-day+ proxy purchase is a real service purchase, with referral rewards as an added benefit, not an entry fee. If there is no valid referrer, only the customer reward is issued.</p>
              <p className="mt-2">Failed, reversed, refunded or fraudulent transactions do not qualify. One customer reward per qualifying customer.</p>
            </div>
          </div>
        </section>

        {item.terms ? <p className="mt-5 whitespace-pre-line text-[9.5px] leading-5 text-[#8C9097]">{item.terms}</p> : null}

        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/register" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0A0B0D] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-[#25272b]">Create your account <ArrowRight className="h-3.5 w-3.5" /></Link>
          <Link href="/dashboard/campaigns" className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-[12px] font-medium text-[#0A0B0D]/70 hover:bg-[#FAFAFA]">View campaign dashboard</Link>
        </div>
      </div>
    </div>
  );
}
