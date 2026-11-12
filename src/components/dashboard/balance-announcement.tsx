"use client";

import { usePathname } from "next/navigation";
import { formatNaira } from "@/lib/utils";

export function WalletBalanceAnnouncement({ balanceMinor }: { balanceMinor: number }) {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard/marketplace")) return null;
  return (
    <div className="sr-only" aria-live="polite">
      Wallet balance {formatNaira(balanceMinor, { exact: true })}.
    </div>
  );
}
