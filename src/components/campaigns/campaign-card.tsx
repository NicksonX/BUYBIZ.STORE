import Link from "next/link";
import { CalendarDays, Gift, Users } from "lucide-react";
import {
  campaignPhase,
  formatCampaignDate,
  type Campaign,
} from "@/server/services/campaigns";

function reward(value: number) {
  return `$${(value / 100).toFixed(0)}`;
}

export function CampaignCard({
  campaign,
  compact = false,
}: {
  campaign: Campaign;
  compact?: boolean;
}) {
  const phase = campaignPhase(campaign);
  const label =
    phase === "active"
      ? "Active now"
      : phase === "ended"
        ? "Completed"
        : phase === "paused"
          ? "Paused"
          : "Coming soon";
  const statusClass =
    phase === "active"
      ? "border-[#B9E8CC] bg-[#ECF8F1] text-[#16794A]"
      : phase === "ended" || phase === "paused"
        ? "border-[#E3E4E7] bg-[#F6F6F7] text-[#6E7178]"
        : "border-[#F1D49A] bg-[#FFF7E8] text-[#946200]";

  return (
    <section className="relative overflow-hidden rounded-[22px] border border-black/[0.08] bg-white text-[#0A0B0D] shadow-[0_24px_60px_-48px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-black/[0.045]" />
      <div className={`relative ${compact ? "p-6 sm:p-8" : "p-7 sm:p-10"}`}>
        <p className="flex items-center gap-2.5 text-[12px] font-medium uppercase tracking-[0.18em] text-[#6E7178]">
          <Gift className="h-5 w-5" strokeWidth={1.7} />
          Referral campaign
        </p>

        <h2
          className={`mt-6 max-w-[800px] font-semibold leading-[1.02] tracking-[-0.05em] ${
            compact ? "text-[32px] sm:text-[38px]" : "text-[36px] sm:text-[44px]"
          }`}
        >
          <Link
            href={`/campaigns/${campaign.slug}`}
            className="transition-colors hover:text-[#3F4146]"
          >
            {campaign.name}
          </Link>
        </h2>

        <p className="mt-5 max-w-[720px] text-[14px] leading-7 text-[#5F6268] sm:text-[16px] sm:leading-8">
          {campaign.description}
        </p>

        <span
          className={`mt-6 inline-flex items-center rounded-full border px-4 py-2 text-[12px] font-medium ${statusClass}`}
        >
          {label}
        </span>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-[16px] border border-black/[0.08] bg-[#FBFBFC] p-5 sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-[#7A7D83] sm:text-[12px]">
              Customer reward
            </p>
            <p
              className={`tabular mt-4 font-semibold leading-none tracking-[-0.055em] ${
                compact ? "text-[42px] sm:text-[50px]" : "text-[46px] sm:text-[58px]"
              }`}
            >
              {reward(campaign.customerRewardCents)}
            </p>
          </div>
          <div className="rounded-[16px] border border-black/[0.08] bg-[#FBFBFC] p-5 sm:p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-[#7A7D83] sm:text-[12px]">
              Referrer reward
            </p>
            <p
              className={`tabular mt-4 font-semibold leading-none tracking-[-0.055em] ${
                compact ? "text-[42px] sm:text-[50px]" : "text-[46px] sm:text-[58px]"
              }`}
            >
              {reward(campaign.referrerRewardCents)}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-3 text-[14px] leading-6 text-[#5F6268] sm:text-[15px]">
          <p className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 shrink-0 text-[#7A7D83]" strokeWidth={1.8} />
            {formatCampaignDate(campaign.startsAt)} – {formatCampaignDate(campaign.endsAt)}
          </p>
          <p className="flex items-center gap-3">
            <Users className="h-5 w-5 shrink-0 text-[#7A7D83]" strokeWidth={1.8} />
            Fund and purchase at least an eligible {campaign.qualifyingProxyDays}-day + proxy plan.
          </p>
        </div>
      </div>
    </section>
  );
}
