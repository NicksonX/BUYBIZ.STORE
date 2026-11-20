"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BadgeDollarSign,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Gift,
  Info,
  Loader2,
  Send,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { submitAmbassadorAddressAction, requestAmbassadorPayoutAction } from "@/server/actions/ambassador";
import { requestCampaignPayoutAction } from "@/server/actions/campaigns";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";
import { formatDate } from "@/lib/utils";

type ReferralStats = { total: number; registered: number; pending: number; qualified: number; rejected: number; rewarded: number; minProxyDays: number };
type AmbassadorData = {
  isAmbassador: boolean; qualified: number; total: number; pending: number; rejected: number;
  availableCents: number; earnedCents: number; config: { referralsRequired: number; withdrawalMinCents: number; commissionCents: number; nextPayoutAt: Date | null };
  address: Address | null; openWithdrawal: Payout | null; withdrawals: Payout[]; promotedAt: Date | null;
};
type Address = { id: string; address: string; status: string; rejectionReason: string | null; createdAt: Date };
type CampaignReward = { id: string; amountCents: number; status: string; availableAt: Date; earnedAt: Date; role: string; customerUsername: string; campaignName: string; rejectionReason: string | null };
type Payout = { id: string; amountCents: number; status: string; walletAddress: string; transactionHash: string | null; requestedAt: Date; paidAt: Date | null; rejectionReason: string | null };
type RewardsData = {
  totals: { earnedCents: number; availableCents: number; pendingCents: number; paidCents: number };
  campaign: { earnedCents: number; availableCents: number; pendingCents: number; paidCents: number };
  ambassador: { earnedCents: number; availableCents: number; pendingCents: number; paidCents: number };
  campaignRewards: CampaignReward[]; payouts: Payout[]; address: Address | null;
  campaignPayoutAt: Date | null; ambassadorNextPayoutAt: Date | null;
};

const usd = (cents: number) => `$${(Number(cents) / 100).toFixed(2)}`;
const mask = (value: string) => value.length > 14 ? `${value.slice(0, 7)}…${value.slice(-6)}` : value;
const statusLabel: Record<string, string> = {
  pending: "Pending", pending_review: "Under review", approved: "Approved", processing: "Processing",
  paid: "Paid", paid_out: "Paid", rejected: "Rejected", reserved: "Pending review", available: "Available",
};
const statusTone = (status: string) => status === "paid" || status === "paid_out" ? "success" as const : status === "rejected" ? "danger" as const : status === "processing" || status === "approved" ? "info" as const : "warning" as const;

function payoutDate(value: Date | string | null) {
  return value ? formatDate(new Date(value)) : "Not scheduled";
}

export function RewardsDashboard({
  referrals, ambassador, rewards, referralLink,
}: {
  referrals: ReferralStats; ambassador: AmbassadorData; rewards: RewardsData; referralLink: string;
}) {
  const [addressState, addressAction, addressPending] = useActionState(submitAmbassadorAddressAction, initialActionState);
  const [campaignState, campaignAction, campaignPending] = useActionState(requestCampaignPayoutAction, initialActionState);
  const [ambassadorState, ambassadorAction, ambassadorPending] = useActionState(requestAmbassadorPayoutAction, initialActionState);

  const required = ambassador.config.referralsRequired;
  const qualified = ambassador.qualified;
  const pendingReferrals = ambassador.pending;
  const qualifyingReferrals = qualified;
  const availableAddress = rewards.address;
  const verifiedAddress = availableAddress?.status === "verified" ? availableAddress : null;
  const openCampaign = rewards.payouts.find((p) => ["pending_review", "approved", "processing"].includes(p.status)) ?? null;
  const openAmbassador = ambassador.openWithdrawal;
  const campaignDateReached = Boolean(rewards.campaignPayoutAt && new Date(rewards.campaignPayoutAt).getTime() <= Date.now());
  const campaignCanRequest = campaignDateReached && rewards.campaign.availableCents > 0 && Boolean(verifiedAddress) && !openCampaign;
  const ambassadorCanRequest = ambassador.isAmbassador && ambassador.availableCents >= ambassador.config.withdrawalMinCents && Boolean(verifiedAddress) && !openAmbassador;
  const payouts = [
    ...rewards.payouts.map((p) => ({ ...p, source: "Campaign", key: `campaign-${p.id}` })),
    ...ambassador.withdrawals.map((p) => ({ ...p, source: "Ambassador", key: `ambassador-${p.id}` })),
  ].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  return (
    <div className="space-y-3.5 sm:space-y-4">
      <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Referrals", value: referrals.total, icon: Users, note: "People who joined with your link" },
          { label: "Qualifying Referrals", value: qualifyingReferrals, icon: BadgeCheck, note: `${referrals.minProxyDays}-day+ purchase verified` },
          { label: "Pending Referrals", value: pendingReferrals, icon: Clock3, note: "Awaiting purchase or review" },
          { label: "Available USD Rewards", value: usd(rewards.totals.availableCents), icon: WalletCards, note: "Available for payout" },
        ].map((item) => (
          <section key={item.label} className="surface-card flex min-h-[104px] flex-col justify-between rounded-[13px] p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-2"><p className="text-[10px] font-medium leading-4 text-muted-foreground">{item.label}</p><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-subtle"><item.icon className="h-3.5 w-3.5 text-muted-foreground" /></span></div>
            <div className="mt-2"><p className="tabular text-[22px] font-semibold leading-none tracking-[-0.035em] sm:text-[24px]">{item.value}</p><p className="mt-1.5 text-[8.5px] leading-3.5 text-muted-foreground">{item.note}</p></div>
          </section>
        ))}
      </div>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-[13px] font-semibold">Referral Activity</h2><p className="mt-0.5 text-[9.5px] text-muted-foreground">A closer look at your referral pipeline.</p></div>
          <Link href="/dashboard/referrals" className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-medium hover:bg-accent">Full referral history <ArrowUpRight className="h-3 w-3" /></Link>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-[1fr_1.35fr] lg:items-center">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-2">
            {[["Total", referrals.total, "All registered"], ["Qualified", qualifyingReferrals, "Reward eligible"], ["Pending", pendingReferrals, "Awaiting action"], ["Rejected", referrals.rejected, "Not eligible"]].map(([label, value, note]) => <div key={String(label)}><p className="text-[9px] text-muted-foreground">{label}</p><p className="tabular mt-0.5 text-[18px] font-semibold">{value}</p><p className="text-[8px] text-muted-foreground">{note}</p></div>)}
          </div>
          <div className="rounded-[9px] border border-border bg-surface-subtle p-2.5">
            <p className="text-[8.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Your referral link</p>
            <div className="mt-1.5 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
              <code className="min-w-0 flex-1 truncate rounded-[6px] border border-border bg-surface px-2 py-2 font-mono text-[8.5px] text-muted-foreground" title={referralLink}>{referralLink}</code>
              <CopyLink value={referralLink} className="w-full justify-center min-[420px]:w-auto" />
            </div>
            <p className="mt-1.5 text-[8.5px] leading-4 text-muted-foreground">Share this link. Qualified referrals earn {usd(ambassador.config.commissionCents)} for both normal and Ambassador rewards.</p>
          </div>
        </div>
      </section>

      <section id="usd-payouts" className="scroll-mt-24 surface-card overflow-hidden rounded-[13px]">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="flex items-center gap-1.5 text-[13px] font-semibold"><BadgeDollarSign className="h-4 w-4 text-muted-foreground" /> USD Payouts</h2><p className="mt-0.5 text-[9.5px] leading-4 text-muted-foreground">One destination for campaign and Ambassador rewards. Paid manually in USDT on BNB Smart Chain after review.</p></div>
          <div className="flex shrink-0 gap-4"><div><p className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">Available</p><p className="tabular mt-0.5 text-[17px] font-semibold">{usd(rewards.totals.availableCents)}</p></div><div><p className="text-[8px] uppercase tracking-[0.1em] text-muted-foreground">Total earned</p><p className="tabular mt-0.5 text-[17px] font-semibold">{usd(rewards.totals.earnedCents)}</p></div></div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-2.5">
            {campaignState.message ? <Alert tone={campaignState.status === "success" ? "success" : "danger"} className="text-[9px]">{campaignState.message}</Alert> : null}
            {ambassadorState.message ? <Alert tone={ambassadorState.status === "success" ? "success" : "danger"} className="text-[9px]">{ambassadorState.message}</Alert> : null}
            {addressState.message ? <Alert tone={addressState.status === "success" ? "success" : "danger"} className="text-[9px]">{addressState.message}</Alert> : null}
            <div className="rounded-[9px] border border-border bg-surface-subtle p-3">
              <div className="flex items-start justify-between gap-2"><div><p className="flex items-center gap-1.5 text-[10px] font-medium"><WalletCards className="h-3 w-3" /> USDT BEP20 payout address</p><p className="mt-1 text-[8.5px] leading-4 text-muted-foreground">One verified address covers campaign and Ambassador rewards. Never submit a seed phrase or private key.</p></div>{verifiedAddress ? <Badge tone="success">Verified</Badge> : availableAddress?.status === "pending" ? <Badge tone="warning">Pending</Badge> : availableAddress?.status === "rejected" ? <Badge tone="danger">Rejected</Badge> : null}</div>
              {verifiedAddress ? <p className="mt-2 flex items-center gap-1.5 rounded-[7px] border border-success/20 bg-success-soft px-2.5 py-1.5 font-mono text-[9px] text-success"><ShieldCheck className="h-3 w-3" /> {mask(verifiedAddress.address)}</p> : null}
              {availableAddress?.status === "pending" ? <p className="mt-2 rounded-[7px] border border-warning/20 bg-warning-soft px-2.5 py-1.5 text-[8.5px] text-warning">Awaiting administrator verification.</p> : null}
              {availableAddress?.status === "rejected" ? <p className="mt-2 rounded-[7px] border border-danger/20 bg-danger-soft px-2.5 py-1.5 text-[8.5px] text-danger">Rejected{availableAddress.rejectionReason ? `: ${availableAddress.rejectionReason}` : "."} Submit a corrected address.</p> : null}
              <details className="mt-2"><summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-[9px] font-medium underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">{verifiedAddress ? "Update address" : "Set up address"} <ChevronDown className="h-3 w-3" /></summary><form action={addressAction} className="mt-2 space-y-2"><Input name="address" required placeholder="0x… USDT BEP20 address" className="h-10 font-mono text-[10px]" /><button type="submit" disabled={addressPending} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[9.5px] font-medium disabled:opacity-50">{addressPending ? <LoadingDots label="Submitting" /> : <WalletCards className="h-3 w-3" />} Submit for verification</button></form></details>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-[9px] border border-border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-medium">Campaign rewards</p><span className="text-[9px] text-muted-foreground">{usd(rewards.campaign.availableCents)} available</span></div>
                <p className="mt-1 text-[8px] leading-4 text-muted-foreground">{rewards.campaignPayoutAt ? `Payout date ${payoutDate(rewards.campaignPayoutAt)}` : "Payout date not configured"}</p>
                {openCampaign ? <p className="mt-1.5 flex items-center gap-1 text-[8.5px] text-warning"><Clock3 className="h-3 w-3" /> {statusLabel[openCampaign.status] ?? openCampaign.status} · {usd(openCampaign.amountCents)}</p> : <form action={campaignAction} className="mt-2"><label className="flex items-start gap-1.5 text-[8px] leading-4 text-muted-foreground"><input type="checkbox" name="confirm" required className="mt-0.5 h-3 w-3 accent-foreground" /> I confirm the verified BEP20 address.</label><button type="submit" disabled={!campaignCanRequest || campaignPending} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3 text-[9px] font-semibold text-background disabled:cursor-not-allowed disabled:opacity-40">{campaignPending ? <LoadingDots label="Requesting" /> : <Send className="h-3 w-3" />} Request campaign payout</button>{!verifiedAddress ? <p className="mt-1 text-[8px] text-muted-foreground">Verify an address first.</p> : null}</form>}
              </div>
              <div className="rounded-[9px] border border-border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-[9px] font-medium">Ambassador rewards</p><span className="text-[9px] text-muted-foreground">{usd(ambassador.availableCents)} available</span></div>
                <p className="mt-1 text-[8px] leading-4 text-muted-foreground">Minimum {usd(ambassador.config.withdrawalMinCents)} · manual review</p>
                {openAmbassador ? <p className="mt-1.5 flex items-center gap-1 text-[8.5px] text-warning"><Clock3 className="h-3 w-3" /> {statusLabel[openAmbassador.status] ?? openAmbassador.status} · {usd(openAmbassador.amountCents)}</p> : ambassador.isAmbassador ? <form action={ambassadorAction} className="mt-2 space-y-1.5"><Input name="amount" type="number" step="0.01" min={ambassador.config.withdrawalMinCents / 100} max={ambassador.availableCents / 100} defaultValue={(ambassador.config.withdrawalMinCents / 100).toFixed(2)} required aria-label="Ambassador payout amount in USD" className="h-9 text-[10px]" /><label className="flex items-start gap-1.5 text-[8px] leading-4 text-muted-foreground"><input type="checkbox" name="confirm" required className="mt-0.5 h-3 w-3 accent-foreground" /> I confirm the amount and BEP20 address.</label><button type="submit" disabled={!ambassadorCanRequest || ambassadorPending} className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3 text-[9px] font-semibold text-background disabled:cursor-not-allowed disabled:opacity-40">{ambassadorPending ? <LoadingDots label="Requesting" /> : <Send className="h-3 w-3" />} Request ambassador payout</button></form> : <p className="mt-2 text-[8px] leading-4 text-muted-foreground">Reach 2 qualified referrals to unlock Ambassador payouts.</p>}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2"><h3 className="text-[10.5px] font-semibold">Payout history</h3><span className="text-[8.5px] text-muted-foreground">{payouts.length} request{payouts.length === 1 ? "" : "s"}</span></div>
            {payouts.length === 0 ? <div className="mt-2 rounded-[9px] border border-dashed border-border px-4 py-8 text-center"><WalletCards className="mx-auto h-5 w-5 text-muted-foreground/60" /><p className="mt-2 text-[10px] font-medium">No payout requests yet.</p><p className="mt-1 text-[9px] text-muted-foreground">Your submitted payout requests will appear here.</p></div> : <div className="mt-2 divide-y divide-border rounded-[9px] border border-border">{payouts.map((payout) => <div key={payout.key} className="px-3 py-2.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="tabular text-[11px] font-semibold">{usd(payout.amountCents)} USDT</p><p className="mt-0.5 text-[8px] text-muted-foreground">{payout.source} · BEP20 · {payout.status === "paid" && payout.paidAt ? <>Paid <time dateTime={new Date(payout.paidAt).toISOString()}>{formatDate(new Date(payout.paidAt))}</time></> : <>Requested <time dateTime={new Date(payout.requestedAt).toISOString()}>{formatDate(new Date(payout.requestedAt))}</time></>}</p></div><Badge tone={statusTone(payout.status)}>{statusLabel[payout.status] ?? payout.status}</Badge></div><p className="mt-1 break-all font-mono text-[7.5px] text-muted-foreground">{mask(payout.walletAddress)}</p>{payout.transactionHash ? <p className="mt-1 break-all font-mono text-[7.5px] text-success">Tx: {payout.transactionHash}</p> : null}{payout.rejectionReason ? <p className="mt-1 text-[8px] text-danger">{payout.rejectionReason}</p> : null}</div>)}</div>}
            <div className="mt-3 grid grid-cols-2 gap-2 text-[8px] text-muted-foreground"><p className="rounded-[7px] bg-surface-subtle px-2 py-1.5">Pending {usd(rewards.totals.pendingCents)}</p><p className="rounded-[7px] bg-surface-subtle px-2 py-1.5">Paid {usd(rewards.totals.paidCents)}</p></div>
          </div>
        </div>
      </section>

      <details className="surface-card rounded-[11px] px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[10px] font-medium [&::-webkit-details-marker]:hidden"><Info className="h-3.5 w-3.5 text-muted-foreground" /> How rewards and payouts work <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" /></summary>
        <div className="mt-3 grid gap-2 border-t border-border pt-3 text-[9px] leading-4 text-muted-foreground sm:grid-cols-2"><p><strong className="font-medium text-foreground">Referral rewards:</strong> A referral must have a verified deposit and complete a {referrals.minProxyDays}-day-or-longer proxy purchase. Each qualifying referral earns {usd(ambassador.config.commissionCents)} in USD.</p><p><strong className="font-medium text-foreground">Ambassador:</strong> Reach {required} qualified referrals to unlock the programme. Progress is capped at 100%; additional qualifying referrals still count normally.</p><p><strong className="font-medium text-foreground">Payouts:</strong> USD rewards are reviewed manually and paid in USDT BEP20. A payout is only marked Paid after confirmed transaction evidence.</p><p><strong className="font-medium text-foreground">Wallet:</strong> USD rewards are separate from your BUYBIZ NGN wallet and cannot be used as wallet credit.</p></div>
      </details>
    </div>
  );
}

function CopyLink({ value, className }: { value: string; className?: string }) {
  return <button type="button" onClick={() => navigator.clipboard?.writeText(value)} className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-[6px] border border-border bg-surface px-2 text-[9px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`} aria-label="Copy referral link"><Copy className="h-3 w-3" /> Copy</button>;
}
