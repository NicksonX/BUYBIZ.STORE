"use client";

import { useActionState } from "react";
import { Gift, ShieldCheck } from "lucide-react";
import { claimGiveawayAction, submitGiveawayWalletAction } from "@/server/actions/giveaways";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { LoadingDots } from "@/components/ui/loading-dots";

export function ClaimForm({ giveawayId }: { giveawayId: string }) {
  const [state, action, pending] = useActionState(claimGiveawayAction, initialActionState);
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="giveawayId" value={giveawayId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input name="code" required placeholder="Enter the giveaway code" className="h-10 flex-1 font-mono uppercase" aria-label="Giveaway claim code" />
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-[10px] font-semibold text-background disabled:opacity-45">{pending ? <LoadingDots label="Claiming giveaway" /> : <Gift className="h-3.5 w-3.5" />} Claim reward</button>
      </div>
      {state.message ? <Alert tone={state.status === "success" ? "success" : "danger"}>{state.message}</Alert> : null}
    </form>
  );
}

export function WalletForm({ claimId }: { claimId: string }) {
  const [state, action, pending] = useActionState(submitGiveawayWalletAction, initialActionState);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="claimId" value={claimId} />
      <Input name="address" required placeholder="0x... USDT BEP20 wallet address" className="h-10 font-mono text-[11px]" aria-label="USDT BEP20 payout address" />
      <p className="text-[8.5px] leading-4 text-warning">Make sure this address supports USDT on BNB Smart Chain (BEP20). Sending to an incompatible address may cause permanent loss.</p>
      <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[9.5px] font-medium disabled:opacity-50">{pending ? <LoadingDots label="Saving payout address" /> : <ShieldCheck className="h-3.5 w-3.5" />} Save payout address</button>
      {state.message ? <Alert tone={state.status === "success" ? "success" : "danger"}>{state.message}</Alert> : null}
    </form>
  );
}
