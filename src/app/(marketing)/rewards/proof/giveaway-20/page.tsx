import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { getGiveawayProof } from "@/server/data/giveaway-proof";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "20 Giveaway Rewards Paid · BUYBIZ",
  description: "See the verified BUYBIZ giveaway recipients and independently verify each USDT BEP20 payment on BscScan.",
};

function usd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function lagosDate(date: Date | null) { return date ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeZone: "Africa/Lagos" }).format(date) : "Verified payout date"; }

export default async function GiveawayProofPage() {
  const proof = await getGiveawayProof("0db86571-564b-40f1-8812-c48f021b6e55");
  const recipients = proof?.recipients ?? [];
  if (!proof || recipients.length === 0) {
    return <main className="mx-auto max-w-[900px] px-5 py-20"><h1 className="text-[32px] font-semibold tracking-[-0.04em]">Payment proof unavailable.</h1><p className="mt-2 text-[13px] text-muted-foreground">No confirmed on-chain giveaway payments are available for public display yet.</p><Link href="/" className="mt-5 inline-flex text-[12px] underline">Return to BUYBIZ</Link></main>;
  }
  return (
    <main className="bg-[#F4F4F5]">
      <section className="relative overflow-hidden bg-[#08090B] px-5 py-14 text-white sm:px-8 sm:py-20">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-20" />
        <div className="relative mx-auto max-w-[1060px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">BUYBIZ giveaway · verified payouts</p>
          <h1 className="mt-4 max-w-[800px] text-[38px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[64px]">{recipients.length} REWARDS. REAL WINNERS.</h1>
          <p className="mt-4 max-w-[620px] text-[13px] leading-6 text-white/55">On {lagosDate(proof.paidAt)}, {recipients.length} members of the BUYBIZ community received their giveaway rewards. Every recipient is listed below, and every payment can be independently verified on the blockchain.</p>
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[["Verified recipients", recipients.length], ["Total distributed", `${usd(proof.totalCents)} USDT`], ["Token", proof.rewardAsset], ["Network", proof.network]].map(([label, value]) => <div key={String(label)} className="rounded-[10px] border border-white/10 bg-white/[0.04] p-3"><p className="text-[8px] uppercase tracking-[0.1em] text-white/35">{label}</p><p className="tabular mt-1.5 text-[13px] font-semibold">{value}</p></div>)}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1060px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-[20px] font-semibold tracking-[-0.035em]">Recipients &amp; payment proof</h2><p className="mt-1 text-[11px] text-muted-foreground">Usernames only. Each link opens the actual USDT BEP20 transaction on BscScan.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[8.5px] text-muted-foreground"><ShieldCheck className="h-3 w-3" /> {recipients.length} on-chain confirmations</span></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {recipients.map((recipient, index) => <article key={recipient.transactionHash} className="rounded-[11px] border border-black/[0.08] bg-white p-3.5"><div className="flex items-start justify-between gap-2"><div><p className="text-[8px] font-medium text-muted-foreground">{String(index + 1).padStart(2, "0")}{recipient.winnerPosition ? ` · Winner #${recipient.winnerPosition}` : ""}</p><p className="tabular mt-1 text-[21px] font-semibold tracking-[-0.03em]">{usd(recipient.amountCents)}</p><p className="mt-0.5 text-[11px] font-medium">@{recipient.username}</p></div><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3FBF6] text-[#16794A]"><Check className="h-3.5 w-3.5" /></span></div><p className="mt-2 text-[8.5px] text-muted-foreground">Payment completed · Verified on blockchain</p><a href={`https://bscscan.com/tx/${recipient.transactionHash}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-full border border-black/10 px-3 text-[8.5px] font-semibold hover:bg-[#F4F4F5]">VERIFY PAYMENT <ArrowUpRight className="h-3 w-3" /></a></article>)}
        </div>
        <div className="mt-6 flex flex-wrap gap-2"><Link href="/dashboard/giveaways" className="inline-flex min-h-10 items-center rounded-full bg-[#08090B] px-4 text-[10px] font-semibold text-white">Check out the rewards <ArrowUpRight className="h-3 w-3" /></Link><Link href="/" className="inline-flex min-h-10 items-center rounded-full border border-black/10 bg-white px-4 text-[10px] font-medium">Back to BUYBIZ</Link></div>
      </section>
    </main>
  );
}
