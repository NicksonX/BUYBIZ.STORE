"use client";

import { useActionState, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Network,
  ShieldCheck,
} from "lucide-react";
import { switchProxyAction } from "@/server/actions/customer";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SwitchOption } from "@/server/services/proxy-management";
import { cn } from "@/lib/utils";
import { LoadingDots } from "@/components/ui/loading-dots";

export function ProxySwitchDialog({
  allocationId,
  currentLabel,
  options,
}: {
  allocationId: string;
  currentLabel: string;
  options: SwitchOption[];
}) {
  const [state, formAction, pending] = useActionState(
    switchProxyAction,
    initialActionState,
  );
  const [selected, setSelected] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={options.length === 0}
          className="tap-target inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {options.length > 0 ? "Switch proxy" : "No switch options"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,700px)] w-[calc(100vw-1.5rem)] max-w-[520px] overflow-y-auto overscroll-contain p-0">
        <div className="border-b border-border px-5 py-4 pr-12">
          <DialogHeader>
            <DialogTitle>Switch to another proxy</DialogTitle>
            <DialogDescription>
              Choose an alternative upstream proxy. Your subscription expiry and
              remaining access time stay exactly the same.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-5">
          {state.message && state.status === "error" ? (
            <Alert tone="danger">{state.message}</Alert>
          ) : null}

          <div className="flex items-center justify-between rounded-[9px] border border-border bg-surface-subtle px-3 py-2 text-[10px]">
            <span className="text-muted-foreground">Current proxy</span>
            <span className="font-medium">{currentLabel}</span>
          </div>

          {options.length === 0 ? (
            <div className="rounded-[11px] border border-dashed border-border-strong bg-surface-subtle px-5 py-8 text-center">
              <Network className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-[12px] font-semibold">No alternatives available</p>
              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                Every other proxy of this type is full or does not cover your
                remaining access window. Try again later or contact support.
              </p>
            </div>
          ) : (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="allocationId" value={allocationId} />
              <fieldset>
                <legend className="sr-only">Available replacement proxies</legend>
                <div className="space-y-2">
                  {options.map((option) => {
                    const active = selected === option.id;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[11px] border p-3 transition-colors",
                          active
                            ? "border-foreground bg-surface-subtle"
                            : "border-border bg-surface hover:border-border-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name="inventoryId"
                          value={option.id}
                          checked={active}
                          onChange={() => setSelected(option.id)}
                          className="sr-only"
                          required
                        />
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border bg-surface">
                          <Network className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11.5px] font-semibold">
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-[9.5px] text-muted-foreground">
                            {option.region ?? "Region not set"} ·{" "}
                            {option.protocol.toUpperCase()} ·{" "}
                            {option.accessType === "single" ? "Personal" : "Shared"}
                          </span>
                        </span>
                        <Badge tone="success" className="shrink-0">
                          Available
                        </Badge>
                        {active ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="flex items-start gap-2 text-[10px] leading-4 text-muted-foreground">
                <input
                  type="checkbox"
                  name="confirm"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-border-strong accent-foreground"
                />
                Switch my proxy now. I understand my old slot will be released and a ₦400 fee will be charged.
              </label>

              <div className="flex items-start gap-2 rounded-[9px] border border-border bg-surface-subtle px-3 py-2 text-[9px] leading-4 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                A ₦400 switching fee is deducted from your wallet. The fee covers
                processing and discourages repeated switching. Your expiry does
                not change, and the server checks capacity again before the switch.
              </div>

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  type="submit"
                  size="md"
                  disabled={pending || !selected}
                  className="h-11 flex-1 rounded-full"
                >
                  {pending ? (
                    <>
                      <LoadingDots /> Switching…
                    </>
                  ) : (
                    "Confirm switch"
                  )}
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" size="md" className="h-11 flex-1 rounded-full">
                    Cancel
                  </Button>
                </DialogClose>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
