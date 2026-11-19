"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, Check, Clock3, Gift, Loader2, LockKeyhole, PartyPopper, ShieldCheck, Sparkles, Wallet, X } from "lucide-react";
import { claimGiveawayAction, submitGiveawayWalletAction } from "@/server/actions/giveaways";
import { initialActionState } from "@/lib/validation/action-state";
import { Badge } from "@/components/ui/badge";
import { LoadingDots } from "@/components/ui/loading-dots";
import { cn } from "@/lib/utils";

type Giveaway = {
  id: string; title: string; description: string; rewardCents: number; asset: string; network: string;
  status: string; startsAt: string | Date | null; endsAt: string | Date | null;
  claimId: string | null; walletAddress: string | null; addressStatus: string | null; paymentStatus: string | null;
};

function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function date(value: string | Date | null) { if (!value) return "To be announced"; return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date(value)); }
function isOpen(g: Giveaway) {
  const now = Date.now();
  return g.status === "active" && (!g.startsAt || new Date(g.startsAt).getTime() <= now) && (!g.endsAt || new Date(g.endsAt).getTime() > now);
}
function timeLeft(g: Giveaway) {
  const target = g.startsAt && new Date(g.startsAt).getTime() > Date.now() ? new Date(g.startsAt).getTime() : g.endsAt ? new Date(g.endsAt).getTime() : 0;
  if (!target) return null;
  return Math.max(0, target - Date.now());
}

export function GiveawayExperience({ giveaway }: { giveaway: Giveaway }) {
  const router = useRouter();
  const [codeOpen, setCodeOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [code, setCode] = useState("");
  const [claimState, claimAction, claimPending] = useActionState(claimGiveawayAction, initialActionState);
  const [walletState, walletAction, walletPending] = useActionState(submitGiveawayWalletAction, initialActionState);
  const [remaining, setRemaining] = useState(() => timeLeft(giveaway));
  const open = isOpen(giveaway);
  const hasClaim = Boolean(giveaway.claimId) || Boolean(claimState.claimId);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(timeLeft(giveaway)), 1000);
    return () => window.clearInterval(timer);
  }, [giveaway]);
  useEffect(() => {
    if (claimState.status === "success") {
      setCodeOpen(false);
      setWalletOpen(true);
      router.refresh();
    }
  }, [claimState.status, router]);
  useEffect(() => {
    if (walletState.status === "success") router.refresh();
  }, [walletState.status, router]);

  const claimId = giveaway.claimId ?? claimState.claimId ?? null;
  const addressSubmitted = giveaway.addressStatus === "submitted";
  const paid = giveaway.paymentStatus === "paid";
  const h = remaining ? Math.floor(remaining / 3_600_000) : 0;
  const m = remaining ? Math.floor((remaining % 3_600_000) / 60_000) : 0;
  const s = remaining ? Math.floor((remaining % 60_000) / 1000) : 0;

  return (
    <>
      <section className="relative overflow-hidden rounded-[22px] bg-[#071A12] p-5 text-white shadow-[0_34px_80px_-48px_rgba(0,0,0,0.8)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#C8A45A]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-[#B9FF66]/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#C8A45A]/30 bg-[#C8A45A]/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#F3D99A]">BUYBIZ COMMUNITY</span><Badge tone={open ? "success" : "warning"} className="border-white/15 bg-white/[0.08] text-white">{open ? "Live now" : giveaway.status === "scheduled" ? "Starting soon" : giveaway.status === "ended" || giveaway.status === "claimed" ? "Closed" : "Paused"}</Badge></div>
            <h1 className="mt-5 max-w-[560px] text-[34px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[52px]">{giveaway.title}</h1>
            <p className="mt-3 max-w-[500px] text-[12px] leading-6 text-white/55 sm:text-[13px]">{giveaway.description || "A small reward from BUYBIZ, with a clear claim process and a manual payout review."}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#F3D99A] px-3.5 py-2 text-[11px] font-bold text-[#071A12]">{money(giveaway.rewardCents)} {giveaway.asset}</span><span className="rounded-full border border-white/15 px-3.5 py-2 text-[9px] text-white/65">BNB Smart Chain · {giveaway.network}</span></div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[9.5px] text-white/50"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3 w-3" /> {date(giveaway.startsAt)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3 w-3" /> {date(giveaway.endsAt)}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Manual review · no auto-payment</span></div>
          </div>
          <div className="rounded-[15px] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/35">{hasClaim ? "Your entry" : open ? "Your next step" : "Giveaway status"}</p>
            {hasClaim ? <div className="mt-3">{paid ? <><p className="flex items-center gap-2 text-[13px] font-semibold text-[#B9FF66]"><BadgeCheck className="h-4 w-4" /> Reward paid</p><p className="mt-1 text-[9.5px] leading-4 text-white/45">Your USDT reward has been confirmed. Check your email for the payment reference.</p></> : addressSubmitted ? <><p className="flex items-center gap-2 text-[13px] font-semibold text-[#F3D99A]"><Check className="h-4 w-4" /> Claim submitted</p><p className="mt-1 text-[9.5px] leading-4 text-white/45">Your wallet address is saved and awaiting review. We will email you when the reward is approved or paid.</p></> : <><p className="flex items-center gap-2 text-[13px] font-semibold text-[#F3D99A]"><Wallet className="h-4 w-4" /> Add your payout address</p><p className="mt-1 text-[9.5px] leading-4 text-white/45">Your claim is confirmed. Submit a USDT BEP20 address to complete the entry.</p><button type="button" onClick={() => setWalletOpen(true)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-[#F3D99A] px-3.5 text-[9.5px] font-semibold text-[#071A12]">Add wallet address <ArrowRight className="h-3.5 w-3.5" /></button></>}</div> : open ? <><p className="mt-3 text-[13px] font-semibold">Enter your official code</p><p className="mt-1 text-[9.5px] leading-4 text-white/45">The claim code is shared through the official BUYBIZ channel. It is never shown in this page or in email.</p><button type="button" onClick={() => setCodeOpen(true)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-semibold text-[#071A12]"><Gift className="h-4 w-4" /> Claim reward <ArrowRight className="h-3.5 w-3.5" /></button></> : <><p className="mt-3 text-[13px] font-semibold">{giveaway.status === "scheduled" || (giveaway.startsAt && new Date(giveaway.startsAt) > new Date()) ? "Starts soon" : "This giveaway is closed"}</p><p className="mt-1 text-[9.5px] leading-4 text-white/45">{remaining ? <span className="tabular">{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")} until {giveaway.startsAt && new Date(giveaway.startsAt) > new Date() ? "launch" : "closing"}</span> : "Check back for the next BUYBIZ giveaway."}</p></>}
            <div className="mt-4 border-t border-white/10 pt-3 text-[8.5px] leading-4 text-white/35">One claim per account. Claim slots are limited and not displayed.</div>
          </div>
        </div>
      </section>

      {!hasClaim && giveaway.status === "active" && (!giveaway.startsAt || new Date(giveaway.startsAt).getTime() <= Date.now()) && (!giveaway.endsAt || new Date(giveaway.endsAt).getTime() > Date.now()) ? <div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="surface-card rounded-[12px] p-3"><p className="text-[9px] text-muted-foreground">Step 01</p><p className="mt-1 text-[10.5px] font-medium">Get the official code</p><p className="mt-1 text-[8.5px] text-muted-foreground">Check the official BUYBIZ channel.</p></div><div className="surface-card rounded-[12px] p-3"><p className="text-[9px] text-muted-foreground">Step 02</p><p className="mt-1 text-[10.5px] font-medium">Enter it here</p><p className="mt-1 text-[8.5px] text-muted-foreground">Server-side verification only.</p></div><div className="surface-card rounded-[12px] p-3"><p className="text-[9px] text-muted-foreground">Step 03</p><p className="mt-1 text-[10.5px] font-medium">Add USDT BEP20 address</p><p className="mt-1 text-[8.5px] text-muted-foreground">Review and payment are manual.</p></div></div> : null}

      {(codeOpen || walletOpen) ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071A12]/75 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={codeOpen ? "Enter giveaway code" : "Add payout address"}>
        <div className="w-full max-w-[430px] rounded-[18px] border border-white/10 bg-[#0A0F0C] p-5 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-[#F3D99A]">{codeOpen ? "Claim your reward" : "Payout details"}</p><h2 className="mt-2 text-[20px] font-semibold tracking-[-0.035em]">{codeOpen ? "Enter the official code." : "Where should we review payment?"}</h2></div><button type="button" onClick={() => { setCodeOpen(false); setWalletOpen(false); }} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 hover:bg-white/10"><X className="h-4 w-4" /></button></div>
          {codeOpen ? <form action={claimAction} className="mt-5"><input type="hidden" name="giveawayId" value={giveaway.id} /><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} name="code" required autoComplete="off" placeholder="Enter code" aria-label="Giveaway code" className="h-11 w-full rounded-[9px] border border-white/15 bg-white/[0.06] px-3 font-mono text-[14px] uppercase tracking-[0.14em] text-white outline-none placeholder:text-white/25 focus:border-[#F3D99A]" /><p className="mt-2 text-[8.5px] leading-4 text-white/40">Codes are checked server-side. A wrong code does not create a claim.</p><button type="submit" disabled={claimPending || code.trim().length < 3} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#F3D99A] px-4 text-[10px] font-semibold text-[#071A12] disabled:opacity-40">{claimPending ? <LoadingDots label="Verifying code" /> : <><Gift className="h-4 w-4" /> Verify & claim</>}</button>{claimState.message ? <p className={`mt-3 rounded-[8px] border px-3 py-2 text-[9px] leading-4 ${claimState.status === "success" ? "border-success/20 bg-success-soft text-success" : "border-danger/20 bg-danger-soft text-danger"}`}>{claimState.message}</p> : null}</form> : <div className="mt-5">{walletState.status === "success" ? <div className="rounded-[10px] border border-[#B9FF66]/20 bg-[#B9FF66]/10 p-3"><p className="flex items-center gap-2 text-[11px] font-semibold text-[#B9FF66]"><Check className="h-4 w-4" /> Claim submitted</p><p className="mt-1 text-[9px] leading-4 text-white/50">Your wallet details are saved for verification. Reward processing is manual; this is not proof of payment.</p></div> : <form action={walletAction} className="space-y-3"><input type="hidden" name="claimId" value={claimId ?? ""} /><div className="rounded-[9px] border border-white/10 bg-white/[0.04] p-2.5 text-[8.5px] leading-4 text-white/45"><span className="font-semibold text-white/70">USDT · BNB Smart Chain (BEP20)</span><br />Only submit an address compatible with USDT BEP20. Never send a seed phrase or private key.</div><input name="address" required placeholder="0x... wallet address" aria-label="USDT BEP20 address" className="h-11 w-full rounded-[9px] border border-white/15 bg-white/[0.06] px-3 font-mono text-[10.5px] text-white outline-none placeholder:text-white/25 focus:border-[#F3D99A]" /><p className="text-[8.5px] leading-4 text-[#F3D99A]/80">Saving an address does not mean payment has been sent.</p><button type="submit" disabled={walletPending || !claimId} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#F3D99A] px-4 text-[10px] font-semibold text-[#071A12] disabled:opacity-40">{walletPending ? <LoadingDots label="Saving address" /> : <><ShieldCheck className="h-4 w-4" /> Save payout address</>}</button>{walletState.message ? <p className="rounded-[8px] border border-danger/20 bg-danger-soft px-3 py-2 text-[9px] leading-4 text-danger">{walletState.message}</p> : null}</form>}</div>}
        </div>
      </div> : null}
    </>
  );
}
