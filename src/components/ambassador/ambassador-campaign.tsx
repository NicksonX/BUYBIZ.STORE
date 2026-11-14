"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Flame,
} from "lucide-react";

function usd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function AmbassadorCampaign({
  variant,
  isAmbassador,
  qualified,
  required,
  commissionCents,
  availableCents,
  minWithdrawalCents,
  nextPayoutAt,
  minProxyDays,
}: {
  variant: "dashboard" | "referral";
  isAmbassador: boolean;
  qualified: number;
  required: number;
  commissionCents: number;
  availableCents: number;
  minWithdrawalCents: number;
  nextPayoutAt: Date | null;
  minProxyDays: number;
}) {
  const [open, setOpen] = useState(false);
  const referral = variant === "referral";
  const progress = Math.min(100, Math.round((qualified / Math.max(required, 1)) * 100));
  const reward = usd(commissionCents);
  const remaining = Math.max(0, required - qualified);
  const href = referral ? "#ambassador-panel" : "/dashboard/referrals";

  return (
    <section
      className={`relative isolate overflow-hidden border border-[#ff5a36]/30 bg-[#210705] text-white shadow-[0_20px_60px_-42px_rgba(255,69,38,0.7)] ${
        referral ? "mt-4 rounded-[15px] p-4 sm:p-5" : "rounded-[14px] p-4"
      }`}
    >
      <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-[#ff4d22]/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#ff8b68]/30 bg-[#ff5a36]/15 text-[#ffb197]">
            <Flame className="h-4 w-4 fill-[#ff6b3d] text-[#ff6b3d]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#ffc4b0]">
              Ambassador rewards
            </p>
            <h2 className="mt-1 text-[16px] font-semibold leading-tight tracking-[-0.025em] sm:text-[18px]">
              {isAmbassador
                ? `Earn ${reward} for every qualified friend.`
                : `Invite friends. Earn ${reward} rewards.`}
            </h2>
            <p className="mt-1 text-[9.5px] leading-4 text-white/70">
              {isAmbassador
                ? `${usd(availableCents)} available in your separate USD balance.`
                : `Free to join. Qualify ${required} referrals to unlock Ambassador, then earn ${reward} per friend who completes a ${minProxyDays}-day+ proxy purchase.`}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[8.5px] text-white/60">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#8EE7B8]" /> Ongoing — no end date</span>
              {nextPayoutAt ? (
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden="true">·</span> Next payout:{" "}
                  {new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(nextPayoutAt)}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={`ambassador-campaign-${variant}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition-colors hover:bg-white/10 hover:text-white motion-reduce:transition-none"
            aria-label={open ? "Collapse Ambassador details" : "Expand Ambassador details"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff8a4c] to-[#ff3d1f]"
              style={{ width: `${isAmbassador ? 100 : progress}%` }}
            />
          </div>
          <span className="shrink-0 tabular text-[8.5px] text-white/70">
            {isAmbassador ? "Ambassador active" : `${qualified}/${required} qualified`}
          </span>
        </div>

        <div
          id={`ambassador-campaign-${variant}`}
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
            open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-white/10 pt-3">
              <p className="text-[9.5px] leading-4 text-white/70">
                {isAmbassador
                  ? `No cap. Every friend who completes a ${minProxyDays}-day+ proxy purchase and the qualifying deposit adds ${reward} to your USD balance. No wallet credits are used.`
                  : `Joining is free. Unlock Ambassador at ${required} qualified referrals, then earn ${reward} for every friend who completes a 7-day+ proxy purchase. No cap.`}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[8.5px] text-white/60">
                <span>Share your link</span>
                <span>·</span>
                <span>Friend joins and qualifies</span>
                <span>·</span>
                <span>Earn USD rewards</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  href={href}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#ff5a36] px-3.5 text-[10px] font-bold text-[#210705]"
                >
                  {isAmbassador ? "Open Ambassador dashboard" : "Start inviting"}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
                <span className="text-[8px] leading-3.5 text-white/60">
                  USD paid as USDT BEP20 from {usd(minWithdrawalCents)} after review.
                </span>
              </div>
              {!isAmbassador && remaining > 0 ? (
                <p className="mt-2 text-[8px] text-white/55">
                  {remaining} more qualified referral{remaining === 1 ? "" : "s"} to unlock Ambassador.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
