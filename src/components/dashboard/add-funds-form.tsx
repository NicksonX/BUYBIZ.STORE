"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { LoadingDots } from "@/components/ui/loading-dots";
import { PaymentProcessingOverlay } from "@/components/wallet/payment-loader";
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
  const [paying, setPaying] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const nativeSubmit = useRef(false);

  useEffect(() => {
    // The reference only exists in the browser, so it is created after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClientReference(`BZ-${crypto.randomUUID()}`);
  }, []);

  useEffect(() => {
    if (state.status === "error") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClientReference(`BZ-${crypto.randomUUID()}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaying(false);
      nativeSubmit.current = false;
    }
  }, [state.status]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (nativeSubmit.current) return;
    event.preventDefault();
    setPaying(true);
    // Give the BUYBIZ loader a visible beat before handing off to checkout.
    window.setTimeout(() => {
      nativeSubmit.current = true;
      formRef.current?.requestSubmit();
    }, 1200);
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="clientReference" value={clientReference} />
      {state.message && state.status === "error" ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}

      {!paymentsEnabled && !demoMode ? (
        <Alert tone="warning" title="Deposits are unavailable">
          Payments are unavailable for this deployment. Please contact support
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
            <ShieldCheck className="h-3.5 w-3.5" />
            {demoMode ? "Demo checkout" : "Secure checkout"}
          </span>
          <span className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {demoMode ? "Simulated" : "Secure"}
          </span>
        </div>
        <p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">
          {demoMode
            ? "Demo mode uses a clearly labelled local checkout page. No real money moves and no real charge is created."
            : "You will be redirected to complete payment securely. BUYBIZ credits your wallet only after server-side verification and does not add fees to your deposit."}
        </p>
        {!demoMode ? (
          <p className="mt-1.5 text-[8.5px] text-muted-foreground/80">
            Channels: {channels.join(", ")}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending || paying || !clientReference || (!paymentsEnabled && !demoMode)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[12px] font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? (
          <>
            <LoadingDots label="Preparing secure payment" /> Preparing payment…
          </>
        ) : (
          <>
            {demoMode ? "Pay (demo)" : "Pay"}
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

      {paying || pending ? <PaymentProcessingOverlay /> : null}
    </form>
  );
}
