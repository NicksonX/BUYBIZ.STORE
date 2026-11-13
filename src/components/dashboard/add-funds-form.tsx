"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowRight, Landmark, Loader2, ShieldCheck } from "lucide-react";
import { initializeDepositAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { formatNaira } from "@/lib/utils";

const presets = [3_000, 5_000, 10_000, 25_000];

export function AddFundsForm({
  minMinor,
  maxMinor,
  demoMode,
  paymentsEnabled,
  channels,
}: {
  minMinor: number;
  maxMinor: number;
  demoMode: boolean;
  paymentsEnabled: boolean;
  channels: string[];
}) {
  const [state, formAction, pending] = useActionState(
    initializeDepositAction,
    initialActionState,
  );
  const [amount, setAmount] = useState(String(Math.round(minMinor / 100)));
  const [clientReference, setClientReference] = useState("");

  useEffect(() => {
    // The reference only exists in the browser, so it is created after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReference(`BZ-${crypto.randomUUID()}`);
  }, []);

  useEffect(() => {
    if (state.status === "error") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientReference(`BZ-${crypto.randomUUID()}`);
    }
  }, [state.status]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientReference" value={clientReference} />
      {state.message && state.status === "error" ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      {!paymentsEnabled && !demoMode ? (
        <Alert tone="warning" title="Deposits are unavailable">
          Paystack is not configured for this deployment. Please contact support
          before attempting a transfer.
        </Alert>
      ) : null}

      <div>
        <label
          htmlFor="deposit-amount"
          className="text-[11px] font-medium text-foreground"
        >
          Amount (NGN credits)
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-muted-foreground">
            ₦
          </span>
          <input
            id="deposit-amount"
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="10,000"
            required
            className="tabular h-12 w-full rounded-[11px] border border-border bg-surface pl-8 pr-3 text-[18px] font-semibold tracking-[-0.03em] outline-none transition-colors placeholder:text-muted-foreground/40 hover:border-border-strong focus:border-foreground/35 focus:ring-4 focus:ring-foreground/[0.05]"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-[9.5px] font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              {formatNaira(preset * 100)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[9px] text-muted-foreground">
          Minimum {formatNaira(minMinor)} · Maximum {formatNaira(maxMinor)} · 1 credit = ₦1
        </p>
      </div>

      <div className="rounded-[9px] border border-border bg-surface-subtle p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-medium">
            <Landmark className="h-3.5 w-3.5" />
            {demoMode ? "Demo checkout" : "Paystack hosted checkout"}
          </span>
          <span className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {demoMode ? "Simulated" : "Secure"}
          </span>
        </div>
        <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">
          {demoMode
            ? "Demo mode uses a clearly labelled local checkout page. No real money moves and no real Paystack charge is created."
            : "You will be redirected to Paystack's secure checkout. BUYBIZ credits your wallet only after server-side verification. BUYBIZ does not add fees to your deposit."}
        </p>
        {!demoMode ? (
          <p className="mt-1.5 text-[8.5px] text-muted-foreground/80">
            Channels: {channels.join(", ")}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending || !clientReference || (!paymentsEnabled && !demoMode)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[12px] font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Starting secure checkout…
          </>
        ) : (
          <>
            {demoMode ? "Continue to demo checkout" : "Continue to Paystack"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-[8.5px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" />
        {demoMode
          ? "No real payment. Demo ledger entries are identified as simulated."
          : "Server-side verification · idempotent wallet credit"}
      </p>
    </form>
  );
}
