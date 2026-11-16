"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { loadWalletTransactions } from "@/server/actions/wallet-history";
import type { WalletTransaction } from "@/server/data/customer";
import { cn, formatNaira } from "@/lib/utils";
import { LoadingDots } from "@/components/ui/loading-dots";

type FilterKey = "all" | "deposits" | "purchases" | "refunds";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "deposits", label: "Deposits" },
  { key: "purchases", label: "Purchases" },
  { key: "refunds", label: "Refunds" },
];

const statusMeta: Record<string, { label: string; dot: string; text: string }> = {
  completed: { label: "Completed", dot: "bg-[#16794A]", text: "text-[#16794A]" },
  pending: { label: "Pending", dot: "bg-[#946200]", text: "text-[#946200]" },
  failed: { label: "Failed", dot: "bg-[#B42318]", text: "text-[#B42318]" },
  refunded: { label: "Refunded", dot: "bg-[#2463A6]", text: "text-[#2463A6]" },
  reversed: { label: "Reversed", dot: "bg-[#B42318]", text: "text-[#B42318]" },
  abandoned: { label: "Abandoned", dot: "bg-[#6E7178]", text: "text-[#6E7178]" },
};

function when(date: Date | string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

function detailDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function MobileWalletTransactions({
  initialItems,
  initialNextOffset,
  compact = false,
  fullHistoryHref = "/dashboard/transactions",
}: {
  initialItems: WalletTransaction[];
  initialNextOffset: number | null;
  compact?: boolean;
  fullHistoryHref?: string;
}) {
  const [items, setItems] = useState<WalletTransaction[]>(initialItems);
  const [nextOffset, setNextOffset] = useState<number | null>(initialNextOffset);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WalletTransaction | null>(null);
  const requestId = useRef(0);

  async function run(nextFilter: FilterKey, nextQuery: string, offset: number, append: boolean) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loadWalletTransactions({ offset, limit: 20, filter: nextFilter, query: nextQuery });
      if (requestId.current !== id) return;
      if (result.ok) {
        setItems((current) => (append ? [...current, ...result.items] : result.items));
        setNextOffset(result.nextOffset);
      } else {
        setError(result.message);
      }
    } catch {
      if (requestId.current === id) setError("Transactions could not be loaded.");
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }

  function applyFilter(next: FilterKey) {
    setFilter(next);
    void run(next, query, 0, false);
  }

  useEffect(() => {
    if (compact) return;
    const timer = window.setTimeout(() => {
      void run(filter, query, 0, false);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const positive = selected ? selected.amountMinor > 0 : false;
  const meta = selected ? statusMeta[selected.status] ?? statusMeta.pending : null;

  return (
    <div className="space-y-2">
      {!compact ? (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transactions"
              aria-label="Search transactions"
              className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-[12px] outline-none placeholder:text-muted-foreground focus:border-border-strong"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => applyFilter(item.key)}
                aria-pressed={filter === item.key}
                className={cn(
                  "tap-target inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-[11px] font-medium transition-colors",
                  filter === item.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[12px] border border-danger/20 bg-danger-soft px-4 py-6 text-center">
          <p className="text-[11px] font-medium text-danger">{error}</p>
          <button
            type="button"
            onClick={() => void run(filter, query, 0, false)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-danger/30 px-3 py-1.5 text-[10px] font-medium text-danger"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-border px-4 py-8 text-center">
          <p className="text-[12px] font-medium">No transactions yet</p>
          <p className="mx-auto mt-1 max-w-[240px] text-[10px] leading-4 text-muted-foreground">
            Your wallet activity will appear here after your first deposit.
          </p>
          <Link href="/dashboard/wallet" className="mt-3 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">
            Add money
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const income = item.amountMinor > 0;
            const status = statusMeta[item.status] ?? statusMeta.pending;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full items-center gap-3 rounded-[8px] px-1 py-3.5 text-left transition-colors hover:bg-accent/50"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                      income ? "border-[#16794A]/15 bg-[#16794A]/10 text-[#16794A]" : "border-border bg-surface-subtle text-muted-foreground",
                    )}
                  >
                    {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{item.title}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                      {when(item.createdAt)}
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                        <span className={status.text}>{status.label}</span>
                      </span>
                    </span>
                  </span>
                  <span
                    className={cn(
                      "tabular shrink-0 text-[13.5px] font-semibold tracking-[-0.01em]",
                      income ? "text-[#16794A]" : "text-foreground",
                    )}
                  >
                    {income ? "+" : "−"}
                    {formatNaira(Math.abs(item.amountMinor), { exact: true })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!error && nextOffset !== null ? (
        <button
          type="button"
          onClick={() => void run(filter, query, nextOffset, true)}
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {loading ? <LoadingDots /> : null}
          Load older transactions
        </button>
      ) : null}

      {compact ? (
        <Link
          href={fullHistoryHref}
          className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-full bg-surface-subtle text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          View full history
        </Link>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-6 text-[10.5px] text-muted-foreground">
          <LoadingDots /> Loading transactions…
        </div>
      ) : null}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{detailDate(selected.createdAt)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <p className={cn("tabular text-[30px] font-semibold tracking-[-0.04em]", positive ? "text-[#16794A]" : "text-foreground")}>
                    {positive ? "+" : "−"}
                    {formatNaira(Math.abs(selected.amountMinor), { exact: true })}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Nigerian naira · BUYBIZ wallet</p>
                </div>
                {meta ? (
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    <span className={cn("text-[11px] font-medium", meta.text)}>{meta.label}</span>
                  </div>
                ) : null}
                <div className="space-y-2.5 border-t border-border pt-3 text-[11px]">
                  {selected.method ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Payment method</span>
                      <span className="font-medium capitalize">{selected.method}</span>
                    </div>
                  ) : null}
                  {selected.feeMinor > 0 ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Gateway fee</span>
                      <span className="tabular font-medium">{formatNaira(selected.feeMinor, { exact: true })}</span>
                    </div>
                  ) : null}
                  {selected.relatedOrderId ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Order</span>
                      <Link href={`/dashboard/orders/${selected.relatedOrderId}`} className="font-medium underline underline-offset-2">
                        View order
                      </Link>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-muted-foreground">Reference</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-mono text-[10px]">{selected.copyReference}</p>
                      <CopyButton value={selected.copyReference} label="Copy" className="shrink-0" />
                    </div>
                  </div>
                </div>
                {selected.status === "failed" || selected.status === "pending" ? (
                  <Link
                    href="/dashboard/support/new"
                    className="inline-flex h-9 w-full items-center justify-center rounded-full border border-border bg-surface text-[10.5px] font-medium hover:bg-accent"
                  >
                    Get help with this transaction
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
