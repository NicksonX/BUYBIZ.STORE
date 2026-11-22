"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

type Data = { name: string; customerRewardCents: number; referrerRewardCents: number; recorded: number; paid: number; pending: number; participants: number };
const usd = (cents: number) => `$${Math.round(Number(cents) / 100).toLocaleString("en-US")}`;

export function SeasonOfRewardsPopup({ data }: { data: Data | null }) {
  const [open, setOpen] = useState(Boolean(data));
  const [seconds, setSeconds] = useState(10);
  const closed = useRef(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { window.clearInterval(timer); setOpen(false); return 0; }
      return value - 1;
    }), 1000);
    return () => { window.clearInterval(timer); document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function close() { if (closed.current) return; closed.current = true; setOpen(false); }
  if (!data || !open) return null;
  const reward = data.customerRewardCents === data.referrerRewardCents ? usd(data.customerRewardCents) : `${usd(data.customerRewardCents)}–${usd(data.referrerRewardCents)}`;
  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/70 p-3 backdrop-blur-[3px] sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="season-title" className="relative max-h-[calc(100dvh-24px)] w-full max-w-[520px] overflow-y-auto rounded-[18px] bg-[#08090B] text-white shadow-[0_30px_110px_-25px_rgba(0,0,0,0.9)]">
        <div className="relative overflow-hidden px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/[0.04] blur-2xl" />
          <div className="relative flex items-start justify-between"><p className="text-[8.5px] font-semibold uppercase tracking-[0.2em] text-white/40">BUYBIZ SEASON OF REWARDS</p><button type="button" onClick={close} aria-label="Close Season of Rewards" className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
          <div className="relative mt-7 flex items-end gap-3"><p className="text-[64px] font-semibold leading-[0.8] tracking-[-0.08em] sm:text-[82px]">{reward}</p><span className="mb-1 rounded-full border border-white/15 px-2.5 py-1 text-[8px] uppercase tracking-[0.1em] text-white/55">for you &amp; your friend</span></div>
          <h2 id="season-title" className="relative mt-5 max-w-[390px] text-[24px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[30px]">YOUR $10 REWARD IS STILL UP FOR GRABS.</h2>
          <p className="relative mt-3 max-w-[420px] text-[10.5px] leading-5 text-white/55">Rewards are already being earned across the BUYBIZ community. There&apos;s still an opportunity to be rewarded — purchase an eligible proxy plan while the campaign is open.</p>
          <div className="relative mt-5 rounded-[10px] border border-white/10 bg-white/[0.04] p-3.5">
            <div className="flex items-end justify-between"><div><p className="text-[8px] uppercase tracking-[0.12em] text-white/35">Recorded campaign rewards</p><p className="tabular mt-1 text-[22px] font-semibold">{usd(data.recorded)}</p></div><div className="text-right"><p className="text-[8px] uppercase tracking-[0.12em] text-white/35">Confirmed paid</p><p className="tabular mt-1 text-[14px] font-medium">{usd(data.paid)}</p></div></div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-white/70" style={{ width: `${data.recorded ? Math.min(100, Math.round((data.paid / data.recorded) * 100)) : 0}%` }} /></div>
            <div className="mt-2 flex justify-between text-[8px] text-white/35"><span>{data.participants} beneficiaries recorded</span><span>{usd(data.pending)} awaiting payout</span></div>
          </div>
          <div className="relative mt-4"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45">Limited campaign rewards remain</p><p className="mt-1 text-[9px] leading-4 text-white/40">Purchase an eligible 7-day-or-longer proxy plan. Wallet funding alone does not qualify.</p></div>
          <div className="relative mt-5 grid gap-2 sm:grid-cols-[1.4fr_1fr]"><Link href="/dashboard/marketplace" onClick={close} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-[10px] font-semibold text-[#08090B]">PURCHASE A PROXY PLAN <ArrowRight className="h-3.5 w-3.5" /></Link><Link href="/dashboard/wallet" onClick={close} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-[10px] font-medium text-white/80">FUND YOUR WALLET</Link></div>
          <div className="relative mt-3 flex items-center justify-between text-[8px] text-white/30"><span>Purchase an eligible proxy plan to qualify.</span><span aria-live="polite">Closing in {seconds}s</span></div>
        </div>
      </div>
    </div>
  );
}
