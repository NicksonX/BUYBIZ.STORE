"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, X } from "lucide-react";

const KEY = "buybiz_giveaway_proof_popup_dismissed_v1";
const BLOCKED = ["/checkout", "/login", "/register", "/signup", "/auth", "/payment", "/reset-password", "/forgot-password", "/rewards/proof"];

export function GiveawayProofPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (BLOCKED.some((path) => pathname.startsWith(path))) return;
    try { if (sessionStorage.getItem(KEY) === "1") return; } catch { /* ignore */ }
    const timer = window.setTimeout(() => setOpen(true), 1400);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  function dismiss() { try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ } setOpen(false); }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center bg-black/70 p-3 backdrop-blur-[3px] sm:items-center sm:p-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="proof-popup-title" className="w-full max-w-[500px] overflow-hidden rounded-[18px] border border-black/10 bg-white text-[#0A0B0D] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.6)]">
        <div className="relative overflow-hidden bg-[#08090B] px-5 pb-6 pt-5 text-white sm:px-6">
          <div className="flex items-center justify-between"><img src="/brand/logo-on-dark.svg" alt="BUYBIZ" className="h-6 w-auto" /><button type="button" onClick={dismiss} aria-label="Close giveaway announcement" className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
          <p className="mt-7 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Community payout proof</p>
          <h2 id="proof-popup-title" className="mt-2 text-[28px] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[34px]">20 GIVEAWAY REWARDS PAID 🎉</h2>
        </div>
        <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <p className="text-[11.5px] leading-5 text-[#4E5157]">20 members of our community received their giveaway rewards! Congratulations to everyone who made it.</p>
          <p className="mt-2 text-[10.5px] leading-5 text-[#6E7178]">Want to see who received their rewards? Check out the complete list of winners and verify their payments on the blockchain.</p>
          <div className="mt-4 grid gap-2"><Link href="/rewards/proof/giveaway-20" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#08090B] px-4 text-[10px] font-semibold text-white">VIEW WINNERS &amp; PAYMENT PROOF <ArrowUpRight className="h-3.5 w-3.5" /></Link><Link href="/dashboard/giveaways" onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-[10px] font-medium">CHECK OUT THE REWARDS</Link><button type="button" onClick={dismiss} className="min-h-9 text-[9px] text-[#6E7178] hover:text-[#0A0B0D]">Maybe later</button></div>
          <p className="mt-2 text-center text-[8px] text-[#8C9097]">Actual verified recipients and on-chain transactions.</p>
        </div>
      </div>
    </div>
  );
}
