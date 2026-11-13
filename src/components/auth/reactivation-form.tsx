"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { reactivateAccountAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import { Alert } from "@/components/ui/alert";

export function ReactivationForm({
  feeMinor,
  balanceMinor,
  feeLabel,
}: {
  feeMinor: number;
  balanceMinor: number;
  feeLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    reactivateAccountAction,
    initialActionState,
  );
  const shortfall = Math.max(0, feeMinor - balanceMinor);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      {state.message && state.status === "error" ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      {shortfall > 0 ? (
        <Alert tone="warning" title="Not enough preserved credit">
          You need ₦{(shortfall / 100).toLocaleString("en-NG")} more to cover the
          reactivation fee. Contact support or ask an administrator to review the
          account. Your balance has not been changed.
        </Alert>
      ) : null}
      <button
        type="submit"
        disabled={pending || shortfall > 0}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12px] font-semibold text-white transition-colors hover:bg-[#1A1C1F] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Reactivating…
          </>
        ) : (
          <>
            <LockKeyhole className="h-4 w-4" /> Reactivate for {feeLabel}
          </>
        )}
      </button>
      <p className="text-center text-[9px] text-[#0A0B0D]/35">
        The fee is deducted once. Your remaining credits stay available.
      </p>
    </form>
  );
}
