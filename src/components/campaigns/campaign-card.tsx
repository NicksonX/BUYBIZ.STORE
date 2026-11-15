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
      <div className={`relative ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
        <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6E7178]">
          <Gift className="h-[18px] w-[18px]" strokeWidth={1.7} />
          Referral campaign
        </p>

        <h2
          className={`mt-5 max-w-[760px] font-semibold leading-[1.03] tracking-[-0.045em] ${
            compact ? "text-[26px] sm:text-[30px]" : "text-[28px] sm:text-[34px]"
          }`}
        >
          <Link
            href={`/campaigns/${campaign.slug}`}
            className="transition-colors hover:text-[#3F4146]"
          >
            {campaign.name}
          </Link>
        </h2>

        <p className="mt-4 max-w-[680px] text-[13px] leading-6 text-[#5F6268] sm:text-[14px] sm:leading-7">
          {campaign.description}
        </p>

        <span
          className={`mt-5 inline-flex items-center rounded-full border px-3.5 py-1.5 text-[11px] font-medium ${statusClass}`}
        >
          {label}
        </span>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-[14px] border border-black/[0.08] bg-[#FBFBFC] p-5 sm:p-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#7A7D83] sm:text-[11px]">
              Customer reward
            </p>
            <p
              className={`tabular mt-3 font-semibold leading-none tracking-[-0.05em] ${
                compact ? "text-[36px] sm:text-[40px]" : "text-[40px] sm:text-[46px]"
              }`}
            >
              {reward(campaign.customerRewardCents)}
            </p>
          </div>
          <div className="rounded-[14px] border border-black/[0.08] bg-[#FBFBFC] p-5 sm:p-6">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#7A7D83] sm:text-[11px]">
              Referrer reward
            </p>
            <p
              className={`tabular mt-3 font-semibold leading-none tracking-[-0.05em] ${
                compact ? "text-[36px] sm:text-[40px]" : "text-[40px] sm:text-[46px]"
              }`}
            >
              {reward(campaign.referrerRewardCents)}
            </p>
          </div>
        </div>

        <div className="mt-7 space-y-2.5 text-[12.5px] leading-5 text-[#5F6268] sm:text-[13px]">
          <p className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-[#7A7D83]" strokeWidth={1.8} />
            {formatCampaignDate(campaign.startsAt)} – {formatCampaignDate(campaign.endsAt)}
          </p>
          <p className="flex items-center gap-2.5">
            <Users className="h-4 w-4 shrink-0 text-[#7A7D83]" strokeWidth={1.8} />
            Fund and purchase at least an eligible {campaign.qualifyingProxyDays}-day+ proxy plan.
          </p>
        </div>
      </div>
    </section>
  );
}
