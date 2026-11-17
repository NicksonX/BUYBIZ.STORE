import { BadgeCheck, Gift, PartyPopper, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { requireUserPage } from "@/server/auth/guards";
import { listGiveawaysForUser } from "@/server/services/giveaways";
import { ClaimForm, WalletForm } from "@/components/giveaways/giveaway-forms";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function usd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default async function GiveawaysPage() {
  const user = await requireUserPage();
  const giveaways = await listGiveawaysForUser(user.id);
  return (
    <div>
      <PageHeader eyebrow="Giveaways" title="A little extra, just for being here." description="Claim a reward with an official giveaway code. Codes are shared through BUYBIZ channels; never enter a code from an untrusted person." />
      {giveaways.length === 0 ? (
        <section className="surface-card mt-4 rounded-[16px] p-8 text-center"><PartyPopper className="mx-auto h-7 w-7 text-muted-foreground" /><h2 className="mt-3 text-[14px] font-semibold">No giveaways yet</h2><p className="mt-1 text-[10px] text-muted-foreground">Check back soon. Rewards are only real when they appear here.</p></section>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {giveaways.map((g) => (
            <section key={g.id} className="surface-card overflow-hidden rounded-[16px]">
              <div className="relative overflow-hidden bg-[#07301F] p-5 text-white">
                <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#B98A2E]/20 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div><p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#FFE9A8]">BUYBIZ giveaway</p><h2 className="mt-2 text-[22px] font-semibold tracking-[-0.035em]">{g.title}</h2></div>
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[8.5px] capitalize text-white/70">{g.status}</span>
                </div>
                <p className="relative mt-2 text-[10.5px] leading-5 text-white/55">{g.description}</p>
                <div className="relative mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#FFE9A8] px-3 py-1.5 text-[11px] font-bold text-[#07301F]">{usd(g.rewardCents)} {g.asset}</span><span className="rounded-full border border-white/15 px-3 py-1.5 text-[9px] text-white/65">{g.network}</span><span className="rounded-full border border-white/15 px-3 py-1.5 text-[9px] text-white/65">{g.claimedCount}/{g.claimLimit} claimed</span></div>
              </div>
              <div className="p-4">
                {g.claimId ? (
                  <div>
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold text-success"><BadgeCheck className="h-3.5 w-3.5" /> Claim confirmed</p>
                    <p className="mt-1 text-[9px] text-muted-foreground">Status: {g.paymentStatus === "paid" ? "Paid" : g.addressStatus === "submitted" ? "Payout address submitted · awaiting review" : "Add your payout address"}</p>
                    {g.paymentStatus === "paid" ? <p className="mt-2 text-[9px] text-success">Reward paid. Check your email for confirmation.</p> : g.addressStatus === "submitted" && g.walletAddress ? <p className="mt-2 break-all font-mono text-[9px] text-muted-foreground">{g.walletAddress.slice(0, 8)}…{g.walletAddress.slice(-6)}</p> : <WalletForm claimId={g.claimId} />}
                  </div>
                ) : g.status === "active" ? (
                  <ClaimForm giveawayId={g.id} />
                ) : (
                  <p className="rounded-[8px] border border-border bg-surface-subtle px-3 py-2 text-[9.5px] text-muted-foreground">This giveaway is not accepting claims right now.</p>
                )}
                {g.endsAt ? <p className="mt-2 text-[8.5px] text-muted-foreground">Ends {formatDateTime(g.endsAt)}</p> : null}
                <p className="mt-2 flex items-start gap-1 text-[8.5px] leading-4 text-muted-foreground"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /> One claim per user. Reward is reviewed and paid manually.</p>
              </div>
            </section>
          ))}
        </div>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-[9px] text-muted-foreground"><Gift className="h-3 w-3" /> Giveaway rewards are separate from referral and campaign rewards.</p>
    </div>
  );
}
