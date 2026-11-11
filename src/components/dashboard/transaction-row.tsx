import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgePlus,
  Landmark,
  RotateCcw,
  Gift,
  type LucideIcon,
} from "lucide-react";
import type { LedgerEntry } from "@/lib/db/types";
import {
  cn,
  formatNaira,
  formatRelativeTime,
} from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  deposit_credit: Landmark,
  purchase_debit: ArrowUpRight,
  refund_credit: RotateCcw,
  admin_credit: BadgePlus,
  admin_debit: BadgePlus,
  transfer_debit: ArrowUpRight,
  transfer_credit: ArrowDownLeft,
  referral_credit: Gift,
  reversal: ArrowDownLeft,
};

export function TransactionRow({
  entry,
  showBalance = false,
  compact = false,
}: {
  entry: LedgerEntry;
  showBalance?: boolean;
  compact?: boolean;
}) {
  const Icon = icons[entry.entryType] ?? Landmark;
  const positive = entry.amountMinor > 0;
  const content = (
    <div className={cn("flex items-center gap-3", compact ? "py-2.5" : "py-3")}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle text-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-medium text-foreground">
          {entry.description}
        </p>
        <p className="mt-0.5 truncate text-[9.5px] text-muted-foreground">
          {formatRelativeTime(entry.createdAt)}
          {entry.orderNumber ? ` · ${entry.orderNumber}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "tabular text-[11.5px] font-semibold",
            positive ? "text-success" : "text-foreground",
          )}
        >
          {positive ? "+" : "−"}
          {formatNaira(Math.abs(entry.amountMinor), { exact: true })}
        </p>
        {showBalance ? (
          <p className="tabular mt-0.5 text-[9px] text-muted-foreground">
            Bal. {formatNaira(entry.balanceAfterMinor, { exact: true })}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (entry.relatedOrderId) {
    return (
      <Link
        href={`/dashboard/orders/${entry.relatedOrderId}`}
        className="block rounded-[9px] px-1 transition-colors hover:bg-surface-subtle"
      >
        {content}
      </Link>
    );
  }
  return <div className="px-1">{content}</div>;
}
