"use client";

import { useActionState } from "react";
import {
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Loader2,
  Send,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  requestAmbassadorPayoutAction,
  submitAmbassadorAddressAction,
} from "@/server/actions/ambassador";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";

type PayoutRow = {
  id: string;
  amountCents: number;
  status: string;
  walletAddress: string;
  transactionHash: string | null;
  requestedAt: Date;
  paidAt: Date | null;
  rejectionReason: string | null;
};

export function AmbassadorPanel({
  isAmbassador,
  qualified,
  required,
  total,
  availableCents,
  earnedCents,
  minWithdrawalCents,
  commissionCents,
  address,
  openWithdrawal,
  withdrawals,
  promotedAt,
}: {
  isAmbassador: boolean;
  qualified: number;
  required: number;
  total: number;
  availableCents: number;
  earnedCents: number;
  minWithdrawalCents: number;
  commissionCents: number;
  address: { id: string; address: string; status: string; rejectionReason: string | null } | null;
  openWithdrawal: PayoutRow | null;
  withdrawals: PayoutRow[];
  promotedAt: Date | null;
}) {
  const [addressState, addressAction, addressPending] = useActionState(
    submitAmbassadorAddressAction,
    initialActionState,
  );
  const [payoutState, payoutAction, payoutPending] = useActionState(
    requestAmbassadorPayoutAction,
    initialActionState,
  );
  const progress = Math.min(100, Math.round((qualified / Math.max(required, 1)) * 100));
  const minLabel = `$${(minWithdrawalCents / 100).toFixed(0)}`;
  const availableLabel = `$${(availableCents / 100).toFixed(2)}`;
  const canRequest =
    isAmbassador &&
    address?.status === "verified" &&
    !openWithdrawal &&
    availableCents >= minWithdrawalCents;

  return (
    <section className="mt-4 overflow-hidden rounded-[16px] border border-border bg-surface">
      <div className="border-b border-border bg-[#0A0B0D] px-5 py-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/40">
              <BadgeDollarSign className="h-3 w-3" /> Ambassador Programme
            </p>
            <h2 className="mt-1.5 text-[18px] font-semibold tracking-[-0.03em]">
              {isAmbassador ? "You are a BUYBIZ Ambassador." : "Your next step with BUYBIZ."}
            </h2>
            <p className="mt-1 max-w-[620px] text-[10px] leading-4 text-white/45">
              {isAmbassador
                ? `You earn $${(commissionCents / 100).toFixed(2)} for every referral that completes the qualifying task. USD earnings stay separate from your naira wallet.`
                : `Refer ${required} friends who complete the qualifying task to unlock Ambassador status and USD commissions.`}
            </p>
          </div>
          <span className="rounded-full border border-white/20 bg-white/[0.04] px-2.5 py-1 text-[9px] font-medium text-white/70">
            {isAmbassador ? "Ambassador" : "In progress"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[10px] border border-border bg-surface-subtle p-3">
              <p className="text-[9px] text-muted-foreground">Qualified referrals</p>
              <p className="tabular mt-1.5 text-[20px] font-semibold">{qualified}/{required}</p>
            </div>
            <div className="rounded-[10px] border border-border bg-surface-subtle p-3">
              <p className="text-[9px] text-muted-foreground">USD available</p>
              <p className="tabular mt-1.5 text-[20px] font-semibold">{isAmbassador ? availableLabel : "$0.00"}</p>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[9px]">
              <span className="text-muted-foreground">Ambassador progress</span>
              <span className="tabular font-medium">{qualified} of {required}</span>
            </div>
            <Progress value={isAmbassador ? 100 : progress} />
          </div>
          {isAmbassador ? (
            <div className="grid gap-2 text-[9.5px] text-muted-foreground sm:grid-cols-2">
              <p className="rounded-[8px] border border-border bg-surface-subtle p-2.5">
                <span className="block text-[8.5px] uppercase tracking-[0.1em]">Total commissions</span>
                <span className="mt-1 block font-semibold text-foreground">${(earnedCents / 100).toFixed(2)}</span>
              </p>
              <p className="rounded-[8px] border border-border bg-surface-subtle p-2.5">
                <span className="block text-[8.5px] uppercase tracking-[0.1em]">Promoted</span>
                <span className="mt-1 block font-semibold text-foreground">{promotedAt ? formatDate(promotedAt) : "Active"}</span>
              </p>
            </div>
          ) : (
            <p className="rounded-[8px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
              Your qualifying referrals are counted automatically. You have {total} total referral{total === 1 ? "" : "s"} so far. The programme is separate from the ₦1,000 wallet reward.
            </p>
          )}

          {isAmbassador ? (
            <div className="rounded-[11px] border border-border p-3.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold">
                <Send className="h-3.5 w-3.5" /> USDT BEP20 payout
              </h3>
              <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
                Minimum {minLabel}. Payout is sent in USDT on BNB Smart Chain (BEP20). Processing can take up to 3 days after the request.
              </p>
              {addressState.message ? (
                <Alert tone={addressState.status === "success" ? "success" : "danger"} className="mt-2 text-[9.5px]">
                  {addressState.message}
                </Alert>
              ) : null}
              {address?.status === "verified" ? (
                <div className="mt-2.5 rounded-[8px] border border-success/20 bg-success-soft px-3 py-2">
                  <p className="flex items-center gap-1 text-[8.5px] font-medium text-success"><ShieldCheck className="h-3 w-3" /> Verified BEP20 address</p>
                  <p className="mt-1 break-all font-mono text-[9px]">{address.address}</p>
                </div>
              ) : (
                <form action={addressAction} className="mt-2.5 space-y-2">
                  {address?.status === "pending" ? (
                    <p className="rounded-[8px] border border-warning/20 bg-warning-soft px-2.5 py-2 text-[9px] text-warning">
                      Address submitted. Waiting for administrator verification.
                    </p>
                  ) : null}
                  {address?.status === "rejected" ? (
                    <p className="rounded-[8px] border border-danger/20 bg-danger-soft px-2.5 py-2 text-[9px] text-danger">
                      Address rejected{address.rejectionReason ? `: ${address.rejectionReason}` : "."} Submit a corrected address.
                    </p>
                  ) : null}
                  <Input name="address" required placeholder="0x... USDT BEP20 wallet address" className="h-9 font-mono text-[10px]" />
                  <button type="submit" disabled={addressPending} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[9.5px] font-medium hover:bg-accent disabled:opacity-50">
                    {addressPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <WalletCards className="h-3 w-3" />}
                    Submit address for verification
                  </button>
                </form>
              )}

              {openWithdrawal ? (
                <div className="mt-3 rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] text-warning">
                  <Clock3 className="mr-1 inline h-3 w-3" />
                  {openWithdrawal.status === "pending" ? "Payout request awaiting review" : "Payout approved and being processed"}: ${(openWithdrawal.amountCents / 100).toFixed(2)}. We will email you when it changes.
                </div>
              ) : canRequest ? (
                <form action={payoutAction} className="mt-3 space-y-2">
                  {payoutState.message ? (
                    <Alert tone={payoutState.status === "success" ? "success" : "danger"} className="text-[9.5px]">
                      {payoutState.message}
                    </Alert>
                  ) : null}
                  <div className="flex gap-2">
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      min={minWithdrawalCents / 100}
                      max={availableCents / 100}
                      defaultValue={(minWithdrawalCents / 100).toFixed(2)}
                      required
                      className="h-9 text-[11px]"
                      aria-label="Payout amount in USD"
                    />
                    <button type="submit" disabled={payoutPending} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[9.5px] font-semibold text-background disabled:opacity-50">
                      {payoutPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                      Request payout
                    </button>
                  </div>
                  <label className="flex items-start gap-1.5 text-[8.5px] leading-4 text-muted-foreground">
                    <input type="checkbox" name="confirm" required className="mt-0.5 h-3 w-3 accent-foreground" />
                    I confirm this BEP20 address and amount are correct.
                  </label>
                </form>
              ) : (
                <p className="mt-2.5 text-[9px] text-muted-foreground">
                  {availableCents < minWithdrawalCents
                    ? `You need at least ${minLabel} available to request a payout.`
                    : "Add and verify a BEP20 address to request a payout."}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div>
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold"><Clock3 className="h-3.5 w-3.5" /> Payout history</h3>
          {withdrawals.length === 0 ? (
            <p className="mt-2 rounded-[8px] border border-dashed border-border px-3 py-5 text-center text-[9px] text-muted-foreground">No payout requests yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {withdrawals.slice(0, 8).map((payout) => (
                <div key={payout.id} className="rounded-[8px] border border-border px-3 py-2.5 text-[9px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular font-semibold">${(payout.amountCents / 100).toFixed(2)} USDT</span>
                    <Badge tone={payout.status === "paid" ? "success" : payout.status === "rejected" ? "danger" : payout.status === "processing" ? "info" : "warning"}>{payout.status}</Badge>
                  </div>
                  <p className="mt-1 text-[8.5px] text-muted-foreground">Requested {formatDate(payout.requestedAt)}</p>
                  {payout.transactionHash ? <p className="mt-1 break-all font-mono text-[8px] text-success">{payout.transactionHash}</p> : null}
                  {payout.rejectionReason ? <p className="mt-1 text-[8.5px] text-danger">{payout.rejectionReason}</p> : null}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 rounded-[8px] border border-border bg-surface-subtle p-3 text-[8.5px] leading-4 text-muted-foreground">
            <CheckCircle2 className="mr-1 inline h-3 w-3 text-success" />
            Ambassador USD balances are separate from BUYBIZ wallet credits and are paid manually in USDT BEP20 after review.
          </div>
        </div>
      </div>
    </section>
  );
}
