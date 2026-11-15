"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddFundsForm } from "@/components/dashboard/add-funds-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FundWalletButtonProps = {
  minMinor: number;
  maxMinor: number;
  demoMode: boolean;
  paymentsEnabled: boolean;
  channels: string[];
  variant?: "primary" | "light" | "outline";
  label?: string;
  className?: string;
};

const variants = {
  primary:
    "bg-foreground text-background hover:opacity-90",
  light:
    "bg-white text-[#0A0B0D] hover:bg-white/90",
  outline:
    "border border-border bg-surface text-foreground hover:bg-accent",
};

export function FundWalletButton({
  minMinor,
  maxMinor,
  demoMode,
  paymentsEnabled,
  channels,
  variant = "primary",
  label = "Add money",
  className,
}: FundWalletButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "tap-target inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[11.5px] font-semibold transition-colors sm:min-h-9 sm:px-3.5 sm:text-[11px]",
            variants[variant],
            className,
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          {label}
        </button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[440px] overflow-hidden rounded-[18px] p-0 max-sm:max-h-[88dvh]">
        <div className="max-h-[min(88dvh,660px)] overflow-y-auto overscroll-contain p-5 pr-12 sm:p-6 sm:pr-14">
          <DialogHeader>
            <DialogTitle>Add money to your wallet</DialogTitle>
            <DialogDescription>
              Choose an amount, then continue to secure checkout. Your wallet is
              credited only after the server verifies the payment.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-1">
            {open ? (
              <AddFundsForm
                minMinor={minMinor}
                maxMinor={maxMinor}
                demoMode={demoMode}
                paymentsEnabled={paymentsEnabled}
                channels={channels}
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
