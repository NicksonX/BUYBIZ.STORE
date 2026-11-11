import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgePlus,
  Landmark,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUserPage } from "@/server/auth/guards";
import { getLedgerForUser, getWalletSummary } from "@/server/data/customer";
import { ledgerTypeLabel } from "@/lib/status";
import type { LedgerEntryType } from "@/lib/db/types";
import { cn, formatNaira, formatShortDateTime, truncateMiddle } from "@/lib/utils";

export const dynamic = "force-dynamic";

const filters = [
  { key: "all", label: "All entries" },
  { key: "deposit_credit", label: "Deposits" },
  { key: "purchase_debit", label: "Purchases" },
  { key: "refund_credit", label: "Refunds" },
  { key: "admin", label: "Adjustments" },
] as const;

const entryIcons = {
  deposit_credit: Landmark,
  purchase_debit: ArrowUpRight,
  refund_credit: RotateCcw,
  admin_credit: BadgePlus,
  admin_debit: BadgePlus,
  transfer_debit: ArrowUpRight,
  transfer_credit: ArrowDownLeft,
  reversal: ArrowDownLeft,
} as const;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const raw = Array.isArray(params.type) ? params.type[0] : params.type;
  const activeFilter = filters.some((filter) => filter.key === raw)
    ? (raw as (typeof filters)[number]["key"])
    : "all";

  const [wallet, ledger] = await Promise.all([
    getWalletSummary(user.id),
    getLedgerForUser(user.id, 200),
  ]);

  const filtered = ledger.filter((entry) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "admin") {
      return entry.entryType === "admin_credit" || entry.entryType === "admin_debit";
    }
    return entry.entryType === activeFilter;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Transactions"
        title="Every movement in your wallet."
        description="Each deposit, purchase and refund is its own entry. Nothing is edited or deleted, so the history stays intact."
        actions={
          <Link
            href="/dashboard/wallet"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-[11px] font-medium hover:bg-accent"
          >
            <Wallet className="h-3.5 w-3.5" /> Wallet
          </Link>
        }
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { label: "Available balance", value: wallet.balanceMinor, tone: "" },
          { label: "Total deposited", value: wallet.totalDepositedMinor, tone: "text-success" },
          {
            label: "Net spend",
            value: Math.max(0, wallet.totalSpentMinor - wallet.totalRefundedMinor),
            tone: "",
          },
          { label: "Total refunded", value: wallet.totalRefundedMinor, tone: "text-success" },
        ].map((item) => (
          <div key={item.label} className="surface-card rounded-[12px] p-3.5">
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              {item.label}
            </p>
            <p className={cn("tabular mt-2 text-[16px] font-semibold tracking-[-0.03em]", item.tone)}>
              {formatNaira(item.value, { exact: true })}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={
              filter.key === "all"
                ? "/dashboard/transactions"
                : `/dashboard/transactions?type=${filter.key}`
            }
            className={cn(
              "tap-target inline-flex min-h-11 items-center rounded-full border px-3.5 text-[11.5px] font-medium transition-colors sm:min-h-7 sm:text-[10px]",
              activeFilter === filter.key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={ReceiptText}
            title="No matching ledger entries"
            description="Wallet deposits, proxy purchases and refunds will appear here as immutable entries."
            action={
              <Link
                href="/dashboard/wallet"
                className="text-[11px] font-medium underline underline-offset-2"
              >
                Add funds
              </Link>
            }
          />
        </div>
      ) : (
        <div className="surface-card mt-4 overflow-hidden rounded-[15px]">
          <div className="hidden grid-cols-[1.5fr_0.6fr_0.6fr_0.6fr_0.8fr_24px] gap-3 border-b border-border bg-surface-subtle/60 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground lg:grid">
            <span>Entry</span>
            <span>Type</span>
            <span>Amount</span>
            <span>Balance</span>
            <span>Reference</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {filtered.map((entry) => {
              const Icon = entryIcons[entry.entryType as LedgerEntryType] ?? ReceiptText;
              const positive = entry.amountMinor > 0;
              return (
                <div
                  key={entry.id}
                  className="grid gap-2 px-4 py-3 lg:grid-cols-[1.5fr_0.6fr_0.6fr_0.6fr_0.8fr_24px] lg:items-center lg:gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle">
                      <Icon
                        className={cn("h-3.5 w-3.5", positive && "text-success")}
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[10.5px] font-medium">
                        {entry.description}
                      </p>
                      <p className="mt-0.5 text-[8.5px] text-muted-foreground">
                        {formatShortDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <Badge tone="neutral">{ledgerTypeLabel(entry.entryType)}</Badge>
                  </div>
                  <p
                    className={cn(
                      "tabular text-[11px] font-semibold",
                      positive ? "text-success" : "text-foreground",
                    )}
                  >
                    {positive ? "+" : "−"}
                    {formatNaira(Math.abs(entry.amountMinor), { exact: true })}
                  </p>
                  <p className="tabular hidden text-[10px] text-muted-foreground lg:block">
                    {formatNaira(entry.balanceAfterMinor, { exact: true })}
                  </p>
                  <div className="hidden min-w-0 lg:block">
                    <p
                      className="truncate font-mono text-[8px] text-muted-foreground"
                      title={entry.reference}
                    >
                      {truncateMiddle(entry.reference, 12, 6)}
                    </p>
                  </div>
                  <div className="hidden justify-end lg:flex">
                    {entry.relatedOrderId ? (
                      <Link
                        href={`/dashboard/orders/${entry.relatedOrderId}`}
                        aria-label="View related order"
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 lg:hidden">
                    <span className="font-mono text-[8px] text-muted-foreground">
                      Bal. {formatNaira(entry.balanceAfterMinor, { exact: true })}
                    </span>
                    {entry.relatedOrderId ? (
                      <Link
                        href={`/dashboard/orders/${entry.relatedOrderId}`}
                        className="text-[9px] font-medium underline underline-offset-2"
                      >
                        Order
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9.5px] leading-4 text-muted-foreground">
        <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          The wallet ledger is the source of truth for your balance. Corrections
          are made with new adjusting entries, never by editing or deleting a
          previous transaction. Opening a different user's entry ID cannot expose
          it to you. Every query is scoped to your authenticated account.
        </p>
      </div>
    </div>
  );
}
