"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatNaira } from "@/lib/utils";

export function WalletBalanceAmount({ amountMinor }: { amountMinor: number }) {
  const [visible, setVisible] = useState(true);

  return (
    <div className="mt-5 flex items-center gap-2.5 sm:mt-6">
      <p className="tabular text-[31px] font-semibold leading-none tracking-[-0.055em] sm:text-[40px]">
        {visible ? formatNaira(amountMinor, { exact: true }) : "₦••••••"}
      </p>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide wallet balance" : "Show wallet balance"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/80"
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
