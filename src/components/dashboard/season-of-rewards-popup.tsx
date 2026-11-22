"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

type Data = {
  name: string;
  customerRewardCents: number;
  referrerRewardCents: number;
  recorded: number;
  paid: number;
  pending: number;
  participants: number;
  endsAt: Date | string;
};
const usd = (cents: number) => `$${Math.round(Number(cents) / 100).toLocaleString("en-US")}`;

export function SeasonOfRewardsPopup({ data }: { data: Data | null }) {
  const [open, setOpen] = useState(Boolean(data));
  const [seconds, setSeconds] = useState(10);
  const closed = useRef(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setOpen(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(timer);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closed.current = true;
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    if (closed.current) return;
    closed.current = true;
    setOpen(false);
  }

  if (!data || !open) return null;
  const left = data.customerRewardCents;
  const right = data.referrerRewardCents;
  const end = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(data.endsAt));

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/70 p-3 backdrop-blur-[2px] sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="season-title" className="relative max-h-[calc(100dvh-24px)] w-full max-w-[490px] overflow-y-auto overscroll-contain rounded-[17px] bg-[#08090B] text-white shadow-[0_28px_90px_-30px_rgba(0,0,0,0.9)]">
        <div className="px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5"><img src="/brand/logo-on-dark.svg" alt="BUYBIZ" className="h-5 w-auto" /><span className="hidden h-3 w-px bg-white/15 sm:block" /><p className="hidden text-[8px] font-medium uppercase tracking-[0.16em] text-white/40 sm:block">Season of Rewards</p></div>
            <button type="button" onClick={close} aria-label="Close Season of Rewards" className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>

          <p className="mt-6 text-[8.5px] font-semibold uppercase tracking-[0.17em] text-white/40">BUYBIZ SEASON OF REWARDS</p>
          <h2 id="season-title" className="mt-2 max-w-[380px] text-[25px] font-semibold leading-[1.03] tracking-[-0.045em] sm:text-[30px]">Your $10 reward is still up for grabs.</h2>
          <p className="mt-2 max-w-[390px] text-[10.5px] leading-[1.6] text-white/55">Buy an eligible proxy plan and you can earn $10. Your friend can earn $10 too. It is that simple.</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[9px] border border-white/10 bg-white/[0.04] p-3"><p className="text-[8px] text-white/35">You earn</p><p className="tabular mt-1 text-[26px] font-semibold leading-none">{usd(left)}</p><p className="mt-1 text-[8px] text-white/35">after a qualifying purchase</p></div>
            <div className="rounded-[9px] border border-white/10 bg-white/[0.04] p-3"><p className="text-[8px] text-white/35">Your friend earns</p><p className="tabular mt-1 text-[26px] font-semibold leading-none">{usd(right)}</p><p className="mt-1 text-[8px] text-white/35">when they qualify too</p></div>
          </div>

          <div className="mt-3 rounded-[9px] border border-white/10 p-3">
            <div className="flex items-center justify-between gap-3"><p className="text-[8.5px] font-medium text-white/55">Community rewards recorded</p><p className="tabular text-[13px] font-semibold">{usd(data.recorded)}</p></div>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-[8px] text-white/35"><span>{data.participants} members have rewards recorded</span><span>{usd(data.pending)} awaiting payout</span></div>
          </div>

          <p className="mt-3 text-[9px] leading-4 text-white/45">Purchase an eligible 7 day or longer proxy plan. Funding your wallet alone does not qualify. The campaign closes on {end}.</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1.35fr_1fr]">
            <Link href="/dashboard/marketplace" onClick={close} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-[10px] font-semibold text-[#08090B]">PURCHASE A PROXY PLAN <ArrowRight className="h-3.5 w-3.5" /></Link>
            <Link href="/dashboard/wallet" onClick={close} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-[10px] font-medium text-white/80">FUND YOUR WALLET</Link>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[8px] text-white/30"><span>Purchase an eligible plan to qualify.</span><span aria-live="polite">Closing in {seconds}s</span></div>
        </div>
      </div>
    </div>
  );
}
