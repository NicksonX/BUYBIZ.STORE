"use client";

import { useActionState } from "react";
import { AlertTriangle, ShieldAlert, Wallet } from "lucide-react";
import { terminateProxyAction } from "@/server/actions/customer";
import { initialActionState } from "@/lib/validation/action-state";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { LoadingDots } from "@/components/ui/loading-dots";

export function ProxyTerminationDialog({
  allocationId,
  productName,
  amountPaidMinor,
  totalDays,
  daysUsed,
  usedMinor,
  refundMinor,
  terminationFeeMinor,
}: {
  allocationId: string;
  productName: string;
  amountPaidMinor: number;
  totalDays: number;
  daysUsed: number;
  usedMinor: number;
  refundMinor: number;
  terminationFeeMinor: number;
}) {
  const [state, formAction, pending] = useActionState(
    terminateProxyAction,
    initialActionState,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="tap-target inline-flex h-11 items-center justify-center gap-2 rounded-full border border-danger/20 bg-danger-soft px-4 text-[11px] font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Terminate proxy
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,680px)] w-[calc(100vw-1.5rem)] max-w-[470px] overflow-y-auto overscroll-contain p-0">
        <div className="border-b border-border px-5 py-4 pr-12">
          <DialogHeader>
            <DialogTitle>Terminate this proxy?</DialogTitle>
            <DialogDescription>
              {productName}. This immediately ends access and releases your slot.
              It cannot be undone.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-5">
          {state.message && state.status === "error" ? (
            <Alert tone="danger">{state.message}</Alert>
          ) : null}

          <div className="rounded-[12px] border border-border bg-surface-subtle p-4">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Total paid</span>
              <span className="tabular font-medium">
                {formatNaira(amountPaidMinor, { exact: true })}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Completed days</span>
              <span className="tabular font-medium">
                {daysUsed} of {totalDays}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Amount used</span>
              <span className="tabular font-medium">
                {formatNaira(usedMinor, { exact: true })}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Termination fee</span>
              <span className="tabular font-medium">{formatNaira(terminationFeeMinor, { exact: true })}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="flex items-center gap-1.5 text-[11px] font-medium">
                <Wallet className="h-3.5 w-3.5" /> Refund to wallet
              </span>
              <span className="tabular text-[14px] font-semibold text-foreground">
                {formatNaira(refundMinor, { exact: true })}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-[10px] border border-warning/20 bg-warning-soft px-3 py-2.5 text-[9.5px] leading-4 text-warning">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Completed 24-hour periods are charged at the plan's daily rate. A
            ₦800 termination fee is deducted from any refund. The refund is
            calculated again on our server when you confirm.
          </div>

          <form action={formAction} className="space-y-3">
            <input type="hidden" name="allocationId" value={allocationId} />
            <label className="flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
              <input
                type="checkbox"
                name="confirm"
                required
                className="mt-0.5 h-4 w-4 rounded border-border-strong accent-foreground"
              />
              I understand access ends immediately and this cannot be undone.
            </label>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="submit"
                variant="danger"
                size="md"
                disabled={pending}
                className="h-11 flex-1 rounded-full"
              >
                {pending ? (
                  <>
                    <LoadingDots /> Terminating…
                  </>
                ) : refundMinor > 0 ? (
                  `Terminate and refund ${formatNaira(refundMinor, { exact: true })}`
                ) : (
                  "Terminate proxy"
                )}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="md" className="h-11 flex-1 rounded-full">
                  Keep proxy
                </Button>
              </DialogClose>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
