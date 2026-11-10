"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertTriangle, ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { purchaseAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";
import { formatNaira } from "@/lib/utils";

export function CheckoutForm({
  productSlug,
  idempotencyKey,
  priceMinor,
  balanceMinor,
  available,
  insufficient,
}: {
  productSlug: string;
  idempotencyKey: string;
  priceMinor: number;
  balanceMinor: number;
  available: boolean;
  insufficient: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    purchaseAction,
    initialActionState,
  );
  const disabled = !available || insufficient;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {state.message && state.status === "error" ? (
        <Alert tone="danger" title="Purchase not completed">
          {state.message}
        </Alert>
      ) : null}

      {!available ? (
        <Alert tone="warning" title="No eligible proxy right now">
          No inventory currently has a free seat and enough remaining upstream
          lifetime for this package. Nothing will be charged. Please try another
          plan or check back later.
        </Alert>
      ) : null}

      {available && insufficient ? (
        <Alert tone="warning" title="Wallet balance too low">
          You need {formatNaira(priceMinor - balanceMinor, { exact: true })} more
          to buy this plan.{" "}
          <Link href="/dashboard/wallet" className="font-semibold underline">
            Add funds
          </Link>
          .
        </Alert>
      ) : null}

      <label className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-border bg-surface-subtle p-3 text-[10.5px] leading-4 text-muted-foreground">
        <input
          type="checkbox"
          name="confirm"
          required
          disabled={disabled}
          className="mt-0.5 h-3.5 w-3.5 rounded border-border-strong accent-foreground"
        />
        <span>
          I confirm the wallet debit of{" "}
          <strong className="font-semibold text-foreground">
            {formatNaira(priceMinor, { exact: true })}
          </strong>
          . I understand the proxy is shared with up to 10 customers and my
          access expires at the timestamp shown after allocation.
        </span>
      </label>

      <button
        type="submit"
        disabled={disabled || pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground text-[12.5px] font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Confirming allocation…
          </>
        ) : (
          <>
            <LockKeyhole className="h-3.5 w-3.5" />
            Pay {formatNaira(priceMinor, { exact: true })} from wallet
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-[9px] leading-4 text-muted-foreground">
        <AlertTriangle className="h-3 w-3" />
        If no proxy can be allocated at confirmation time, the full amount is
        returned to your wallet automatically.
      </p>
    </form>
  );
}
