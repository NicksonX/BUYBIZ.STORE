import Link from "next/link";
import { ArrowUpRight, Award, BadgeCheck, Clock3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

const usd = (cents: number) => `$${(Number(cents) / 100).toFixed(2)}`;

export function AmbassadorProgrammeCard({
  isAmbassador, qualified, required, total, pending, rejected, earnedCents, availableCents, promotedAt, nextPayoutAt, minProxyDays, commissionCents,
}: {
  isAmbassador: boolean; qualified: number; required: number; total: number; pending: number; rejected: number;
  earnedCents: number; availableCents: number; promotedAt: Date | null; nextPayoutAt: Date | null;
  minProxyDays: number; commissionCents: number;
}) {
  const unlocked = isAmbassador || qualified >= required;
  const progress = Math.min(100, Math.round((qualified / Math.max(required, 1)) * 100));
  return (
    <section id="ambassador-programme" className="surface-card scroll-mt-24 overflow-hidden rounded-[13px]">
      <div className="flex flex-col gap-2 border-b border-border bg-[#101311] px-4 py-3.5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"><Award className="h-4 w-4 text-[#F3D99A]" /></span><div><h2 className="text-[12.5px] font-semibold">BUYBIZ Ambassador Programme</h2><p className="mt-0.5 text-[8.5px] text-white/45">Earn {usd(commissionCents)} for every eligible referral who completes a {minProxyDays}-day-or-longer proxy purchase.</p></div></div>
        <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-medium ${unlocked ? "border-[#8EE7B8]/25 bg-[#8EE7B8]/10 text-[#9BE8BE]" : "border-white/15 bg-white/[0.05] text-white/60"}`}>{unlocked ? <><BadgeCheck className="h-3 w-3" /> Ambassador unlocked</> : "In progress"}</span>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] text-muted-foreground">Qualification progress</p><p className="tabular mt-1 text-[21px] font-semibold leading-none">{qualified} <span className="text-[13px] font-normal text-muted-foreground">of {required} required</span></p></div><p className="text-[9px] text-muted-foreground">{unlocked ? "Requirement met" : `${Math.max(0, required - qualified)} more to unlock`}</p></div>
          <Progress value={progress} className="mt-2.5" barClassName={unlocked ? "bg-[#3FBF7F]" : "bg-foreground"} />
          <p className="mt-2 text-[8.5px] leading-4 text-muted-foreground">{qualified > required ? `${qualified} qualifying referrals — requirement exceeded; progress is capped at 100%.` : "Registration alone does not count. A verified deposit and a completed 7-day-or-longer proxy purchase are required."}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] sm:grid-cols-4">{[["Total", total], ["Qualified", qualified], ["Pending", pending], ["Rejected", rejected]].map(([label, value]) => <div key={String(label)} className="rounded-[8px] border border-border bg-surface-subtle p-2"><p className="text-[8px] text-muted-foreground">{label}</p><p className="tabular mt-0.5 text-[14px] font-semibold">{value}</p></div>)}</div>
        </div>
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2"><div className="rounded-[8px] border border-border bg-surface-subtle p-2.5"><p className="text-[8px] text-muted-foreground">Total commissions</p><p className="tabular mt-1 text-[15px] font-semibold">{usd(earnedCents)}</p></div><div className="rounded-[8px] border border-border bg-surface-subtle p-2.5"><p className="text-[8px] text-muted-foreground">Available</p><p className="tabular mt-1 text-[15px] font-semibold">{usd(availableCents)}</p></div></div>
          <p className="flex items-center gap-1.5 text-[8.5px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {unlocked ? `Promoted ${promotedAt ? formatDate(promotedAt) : "—"}` : `Unlock at ${required} qualified referrals`}{nextPayoutAt ? ` · Next $3 batch ${formatDate(nextPayoutAt)}` : ""}</p>
          <Link href="/dashboard/rewards#usd-payouts" className="inline-flex min-h-9 items-center gap-1 text-[9px] font-medium underline underline-offset-2">View USD payouts <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
      </div>
    </section>
  );
}
