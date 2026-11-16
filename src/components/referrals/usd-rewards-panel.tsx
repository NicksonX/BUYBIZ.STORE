"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { submitAmbassadorAddressAction } from "@/server/actions/ambassador";
import { requestCampaignPayoutAction } from "@/server/actions/campaigns";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type CampaignReward = {
  id: string; campaignName: string; role: "customer" | "referrer"; amountCents: number;
  status: string; availableAt: Date; earnedAt: Date; paidAt: Date | null;
  customerUsername: string; referrerUsername: string | null; rejectionReason: string | null;
};
type AmbassadorCommission = { id: string; amountCents: number; createdAt: Date; referralUsername: string };
type Payout = { id: string; amountCents: number; status: string; walletAddress: string; transactionHash: string | null; requestedAt: Date; paidAt: Date | null; rejectionReason: string | null };
type Address = { id: string; address: string; status: string; rejectionReason: string | null; createdAt: Date };

const statusLabel: Record<string, string> = {
  pending: "Pending",
  available: "Available",
  reserved: "Pending review",
  paid: "Paid",
  rejected: "Rejected",
  pending_review: "Pending review",
  approved: "Approved",
  processing: "Processing",
  paid_out: "Paid",
};

function usd(cents: number) { return `$${(Number(cents) / 100).toFixed(2)}`; }
function maskAddress(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}
function date(value: Date | string | null) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(value));
}
function effectiveStatus(row: CampaignReward) {
  if (row.status === "pending" && new Date(row.availableAt).getTime() <= Date.now()) return "available";
  return row.status;
}
function tone(status: string) {
  if (["paid", "available", "paid_out"].includes(status)) return "success" as const;
  if (["rejected", "void"].includes(status)) return "danger" as const;
  if (["reserved", "pending_review", "approved", "processing", "pending"].includes(status)) return "warning" as const;
  return "neutral" as const;
}

export function UsdRewardsPanel({
  totals,
  campaign,
  ambassador,
  campaignRewards,
  ambassadorCommissions,
  payouts,
  address,
  campaignPayoutAt,
  ambassadorNextPayoutAt,
  isAmbassador,
}: {
  totals: { earnedCents: number; availableCents: number; pendingCents: number; paidCents: number };
  campaign: { earnedCents: number; availableCents: number; pendingCents: number; paidCents: number };
  ambassador: { earnedCents: number; availableCents: number; pendingCents: number; paidCents: number };
  campaignRewards: CampaignReward[];
  ambassadorCommissions: AmbassadorCommission[];
  payouts: Payout[];
  address: Address | null;
  campaignPayoutAt: Date | null;
  ambassadorNextPayoutAt: Date | null;
  isAmbassador: boolean;
}) {
  const [addressState, addressAction, addressPending] = useActionState(submitAmbassadorAddressAction, initialActionState);
  const [payoutState, payoutAction, payoutPending] = useActionState(requestCampaignPayoutAction, initialActionState);
  const openPayout = payouts.find((p) => ["pending_review", "approved", "processing"].includes(p.status));
  const campaignCanRequest = campaign.availableCents > 0 && address?.status === "verified" && !openPayout;
  const history = [
    ...campaignRewards.map((row) => ({
      id: `campaign-${row.id}`, source: row.role === "customer" ? "Customer Campaign" : "Referrer Campaign",
      amountCents: row.amountCents, status: effectiveStatus(row), date: row.earnedAt,
      note: row.role === "customer" ? "Your qualifying purchase" : `Referral: @${row.customerUsername}`,
    })),
    ...ambassadorCommissions.map((row) => ({
      id: `ambassador-${row.id}`, source: "Ambassador Programme", amountCents: row.amountCents,
      status: "available", date: row.createdAt, note: `Referral: @${row.referralUsername}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[16px] bg-[#0A0B0D] p-5 text-white">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-[#ff5a36]/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40"><BadgeDollarSign className="h-3 w-3" /> USD rewards</p>
            <p className="tabular mt-2 text-[34px] font-semibold leading-none tracking-[-0.05em]">{usd(totals.earnedCents)}</p>
            <p className="mt-1.5 text-[10px] text-white/45">Total earned across campaigns and Ambassador rewards</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.05] px-2.5 py-1 text-[9px] text-white/65">USD · USDT BEP20</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-3.5">
          {[
            ["Available", totals.availableCents],
            ["Pending", totals.pendingCents],
            ["Paid", totals.paidCents],
          ].map(([label, value]) => (
            <div key={label}><p className="text-[8.5px] uppercase tracking-[0.1em] text-white/40">{label}</p><p className="tabular mt-1 text-[13px] font-semibold">{usd(Number(value))}</p></div>
          ))}
        </div>
      </section>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <section className="surface-card rounded-[13px] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">New campaign rewards</p>
          <p className="tabular mt-2 text-[22px] font-semibold">{usd(campaign.earnedCents)}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-foreground">
            <span>Available {usd(campaign.availableCents)}</span><span>Pending {usd(campaign.pendingCents)}</span><span>Paid {usd(campaign.paidCents)}</span>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-muted-foreground">Customer and referrer rewards are recorded separately.</p>
        </section>
        <section className="surface-card rounded-[13px] p-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ambassador programme</p>
          <p className="tabular mt-2 text-[22px] font-semibold">{usd(ambassador.earnedCents)}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-foreground">
            <span>Available {usd(ambassador.availableCents)}</span><span>Pending {usd(ambassador.pendingCents)}</span><span>Paid {usd(ambassador.paidCents)}</span>
          </div>
          <p className="mt-2 text-[9px] leading-4 text-muted-foreground">{isAmbassador ? "Your Ambassador balance remains separate from campaign rewards." : "Unlock Ambassador status after 2 valid referrals."} The programme is ongoing with no end date. Next $3 payout batch: {ambassadorNextPayoutAt ? date(ambassadorNextPayoutAt) : "scheduled by BUYBIZ"}.</p>
        </section>
      </div>

      <section className="surface-card rounded-[14px] p-4 sm:p-5">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle"><WalletCards className="h-4 w-4 text-muted-foreground" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[12px] font-semibold">USDT BEP20 payout address</h2>
            <p className="mt-1 text-[9.5px] leading-4 text-muted-foreground">Use only a BNB Smart Chain (BEP20) address. One verified address is used for both campaign and Ambassador payouts.</p>
            {addressState.message ? <Alert tone={addressState.status === "success" ? "success" : "danger"} className="mt-2 text-[9.5px]">{addressState.message}</Alert> : null}
            {address?.status === "verified" ? (
              <div className="mt-2 rounded-[8px] border border-success/20 bg-success-soft px-3 py-2">
                <p className="flex items-center gap-1 text-[8.5px] font-medium text-success"><ShieldCheck className="h-3 w-3" /> Verified BEP20 address</p>
                <p className="mt-1 font-mono text-[9px]">{maskAddress(address.address)}</p>
              </div>
            ) : null}
            {address?.status === "pending" ? <p className="mt-2 rounded-[8px] border border-warning/20 bg-warning-soft px-2.5 py-2 text-[9px] text-warning">Address submitted. Waiting for administrator verification.</p> : null}
            {address?.status === "rejected" ? <p className="mt-2 rounded-[8px] border border-danger/20 bg-danger-soft px-2.5 py-2 text-[9px] text-danger">Address rejected{address.rejectionReason ? `: ${address.rejectionReason}` : "."} Submit a corrected address.</p> : null}
            <details className="mt-2">
              <summary className="cursor-pointer text-[9px] font-medium text-muted-foreground hover:text-foreground">{address?.status === "verified" ? "Update address" : "Add / update address"}</summary>
              <form action={addressAction} className="mt-2 flex flex-col gap-2 sm:flex-row">
                <Input name="address" required placeholder="0x... USDT BEP20 address" className="h-9 min-w-0 flex-1 font-mono text-[10px]" />
                <button type="submit" disabled={addressPending} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[9.5px] font-medium hover:bg-accent disabled:opacity-50">{addressPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <WalletCards className="h-3 w-3" />} Submit for verification</button>
              </form>
            </details>
          </div>
        </div>
      </section>

      <section className="surface-card rounded-[14px] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-[12px] font-semibold">Campaign payout</h2><p className="mt-1 text-[9px] leading-4 text-muted-foreground">Available campaign rewards can be requested after {campaignPayoutAt ? date(campaignPayoutAt) : "the scheduled payout date"}. Payment is manual USDT BEP20.</p></div>
          <span className="text-[9px] text-muted-foreground">Minimum: no campaign minimum</span>
        </div>
        {payoutState.message ? <Alert tone={payoutState.status === "success" ? "success" : "danger"} className="mt-2 text-[9.5px]">{payoutState.message}</Alert> : null}
        {openPayout ? (
          <div className="mt-3 rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] text-warning"><Clock3 className="mr-1 inline h-3 w-3" /> {statusLabel[openPayout.status] ?? openPayout.status}: {usd(openPayout.amountCents)}. We will email you when the status changes.</div>
        ) : campaignCanRequest ? (
          <form action={payoutAction} className="mt-3">
            <label className="flex items-start gap-2 text-[8.5px] leading-4 text-muted-foreground">
              <input type="checkbox" name="confirm" required className="mt-0.5 h-3 w-3 accent-foreground" />
              I confirm the verified BEP20 address is correct and understand payouts are processed manually.
            </label>
            <button type="submit" disabled={payoutPending} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-[9.5px] font-semibold text-background disabled:opacity-50">{payoutPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeDollarSign className="h-3 w-3" />} Request {usd(campaign.availableCents)} payout</button>
          </form>
        ) : (
          <p className="mt-3 rounded-[8px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] text-muted-foreground">
            {campaign.availableCents <= 0 ? "No campaign rewards are available yet. Rewards become available on the scheduled payout date." : address?.status !== "verified" ? "Verify a BEP20 address before requesting a payout." : "A payout request is already in progress."}
          </p>
        )}
      </section>

      <section className="surface-card overflow-hidden rounded-[14px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Reward history</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Campaign and Ambassador rewards are listed separately. USD rewards are never added to your NGN wallet.</p></div>
        {history.length === 0 ? <p className="px-4 py-8 text-center text-[10px] text-muted-foreground">No USD rewards yet.</p> : (
          <div className="divide-y divide-border">
            {history.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><p className="text-[10px] font-medium">{row.source}</p><p className="mt-0.5 text-[8.5px] text-muted-foreground">{row.note} · {date(row.date)}</p></div>
                <div className="shrink-0 text-right"><p className="tabular text-[11px] font-semibold">{usd(row.amountCents)}</p><Badge tone={tone(row.status)} className="mt-1">{statusLabel[row.status] ?? row.status}</Badge></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card overflow-hidden rounded-[14px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">USD payout history</h2></div>
        {payouts.length === 0 ? <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No campaign payout requests yet.</p> : (
          <div className="divide-y divide-border">
            {payouts.map((payout) => (
              <div key={payout.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3"><div><p className="tabular text-[12px] font-semibold">{usd(payout.amountCents)} USDT</p><p className="mt-0.5 text-[8.5px] text-muted-foreground">Requested {date(payout.requestedAt)} · BEP20</p></div><Badge tone={tone(payout.status)}>{statusLabel[payout.status] ?? payout.status}</Badge></div>
                <p className="mt-1.5 font-mono text-[8px] text-muted-foreground">{maskAddress(payout.walletAddress)}</p>
                {payout.transactionHash ? <p className="mt-1 break-all font-mono text-[8px] text-success">Tx: {payout.transactionHash}</p> : null}
                {payout.rejectionReason ? <p className="mt-1 text-[8.5px] text-danger">{payout.rejectionReason}</p> : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="flex items-start gap-1.5 px-1 text-[8.5px] leading-4 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" /> USD rewards are separate from BUYBIZ wallet credits and are paid manually in USDT BEP20 after review. BUYBIZ never marks a payout paid without a transaction hash.</p>
      {!isAmbassador ? <p className="px-1 text-[8.5px] text-muted-foreground"><Link href="/dashboard/referrals" className="underline underline-offset-2">View the Ambassador programme</Link> for the existing $3 referral rewards.</p> : null}
    </div>
  );
}
