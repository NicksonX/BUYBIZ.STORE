import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Network,
  ReceiptText,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { requireUserPage } from "@/server/auth/guards";
import { getOrderDetail } from "@/server/data/customer";
import { orderStatusMeta } from "@/lib/status";
import {
  cn,
  formatDateTime,
  formatNaira,
  formatDuration,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUserPage();
  const data = await getOrderDetail(user.id, id);
  if (!data) notFound();
  const { order, ledger } = data;
  const meta = orderStatusMeta(order.status);
  const debit = ledger.find((entry) => entry.entryType === "purchase_debit");
  const refund = ledger.find((entry) => entry.entryType === "refund_credit");

  return (
    <div>
      <PageHeader
        backHref="/dashboard/orders"
        backLabel="Back to orders"
        eyebrow="Order detail"
        title={order.productName}
        description={
          <span className="font-mono text-[11px]">{order.orderNumber}</span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {order.allocationId ? (
              <Link
                href={`/dashboard/proxies/${order.allocationId}`}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "h-8 rounded-full px-3",
                )}
              >
                Open proxy <ArrowUpRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        }
      />

      {order.status === "refunded" ? (
        <Alert tone="warning" title="Refunded to your BUYBIZ balance" className="mt-4">
          No eligible proxy was available when this order was confirmed. We did
          not leave you charged: the full purchase amount was credited back to
          your wallet in the same transaction. This was a wallet credit, not a
          cash withdrawal.
        </Alert>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <section className="surface-card rounded-[15px] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold">Order summary</h2>
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
            </div>
            <dl className="mt-4 space-y-2.5 text-[11px]">
              <Row label="Product">{order.productName}</Row>
              <Row label="Duration">
                {formatDuration(order.durationSeconds)}
              </Row>
              <Row label="Amount">
                <span className="tabular font-semibold">
                  {formatNaira(order.amountMinor, { exact: true })}
                </span>
              </Row>
              <Row label="Created">{formatDateTime(order.createdAt)}</Row>
              <Row label="Completed">{formatDateTime(order.completedAt)}</Row>
              <Row label="Status">
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </Row>
              {order.failureReason ? (
                <Row label="Reason">
                  {order.failureReason === "INSUFFICIENT_STOCK_LIFETIME"
                    ? "Not enough remaining upstream lifetime"
                    : order.failureReason === "OUT_OF_STOCK"
                      ? "No eligible proxy inventory"
                      : order.failureReason}
                </Row>
              ) : null}
            </dl>
          </section>

          {order.allocationId ? (
            <section className="surface-card rounded-[15px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-border bg-surface-subtle">
                    <Network className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[13px] font-semibold">Proxy allocation</h2>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Access expires{" "}
                      {formatDateTime(order.allocationExpiresAt)} · status{" "}
                      {order.allocationStatus}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/proxies/${order.allocationId}`}
                  className="text-[10px] font-medium underline underline-offset-2"
                >
                  View
                </Link>
              </div>
              <p className="mt-3 text-[9.5px] leading-4 text-muted-foreground">
                Connection credentials are shown only in My Proxies and only
                while your access window is active. This order record never
                contains the upstream password.
              </p>
            </section>
          ) : order.status === "refunded" ? (
            <section className="surface-card rounded-[15px] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-warning/20 bg-warning-soft text-warning">
                  <RotateCcw className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[13px] font-semibold">
                    Automatic wallet refund
                  </h2>
                  <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                    A refund credit was linked to this order. No proxy
                    entitlement was created. You can buy again when a suitable
                    proxy is available.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="surface-card overflow-hidden rounded-[15px]">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-[13px] font-semibold">Wallet trail</h2>
              <Link
                href="/dashboard/transactions"
                className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground hover:text-foreground"
              >
                All transactions <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {ledger.length > 0 ? (
              <div className="divide-y divide-border">
                {ledger.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-subtle">
                        {entry.amountMinor > 0 ? (
                          <RotateCcw className="h-3 w-3 text-success" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[10.5px] font-medium">
                          {entry.description}
                        </p>
                        <p className="mt-0.5 font-mono text-[8.5px] text-muted-foreground">
                          {entry.reference}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "tabular text-[10.5px] font-semibold",
                          entry.amountMinor > 0 ? "text-success" : "text-foreground",
                        )}
                      >
                        {entry.amountMinor > 0 ? "+" : "−"}
                        {formatNaira(Math.abs(entry.amountMinor), { exact: true })}
                      </p>
                      <p className="tabular mt-0.5 text-[8.5px] text-muted-foreground">
                        Bal. {formatNaira(entry.balanceAfterMinor, { exact: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-[10.5px] text-muted-foreground">
                No ledger entries are linked to this order.
              </div>
            )}
          </section>
        </div>

        <div className="space-y-3">
          <section className="surface-card rounded-[15px] p-4">
            <h2 className="text-[13px] font-semibold">Timeline</h2>
            <div className="mt-4 space-y-4">
              <TimelineItem
                icon={ReceiptText}
                title="Order created"
                detail={formatDateTime(order.createdAt)}
              />
              {debit ? (
                <TimelineItem
                  icon={Wallet}
                  title="Wallet debited"
                  detail={`${formatNaira(Math.abs(debit.amountMinor), {
                    exact: true,
                  })} · ${formatDateTime(debit.createdAt)}`}
                />
              ) : null}
              {order.allocationId ? (
                <TimelineItem
                  icon={Network}
                  title="Proxy allocated"
                  detail={`Until ${formatDateTime(order.allocationExpiresAt)}`}
                  last
                />
              ) : refund ? (
                <TimelineItem
                  icon={RotateCcw}
                  title="Wallet refund credited"
                  detail={`${formatNaira(refund.amountMinor, {
                    exact: true,
                  })} · ${formatDateTime(refund.createdAt)}`}
                  last
                />
              ) : (
                <TimelineItem
                  icon={Clock3}
                  title="Awaiting allocation"
                  detail="Contact support if this persists."
                  last
                />
              )}
            </div>
          </section>

          <div className="rounded-[12px] border border-border bg-surface-subtle p-4">
            <p className="text-[10px] font-medium">Need help with this order?</p>
            <p className="mt-1 text-[9.5px] leading-4 text-muted-foreground">
              Include the order number when you contact support so we can trace
              the wallet and allocation records.
            </p>
            <Link
              href="/dashboard/support/new"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-medium hover:bg-accent"
            >
              Open a ticket <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <Link
            href="/dashboard/marketplace"
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "h-9 w-full rounded-full",
            )}
          >
            Buy another proxy
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  title,
  detail,
  last,
}: {
  icon: typeof CheckCircle2;
  title: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-subtle">
          <Icon className="h-3 w-3" />
        </span>
        {!last ? <span className="mt-1 h-full min-h-4 w-px bg-border" /> : null}
      </div>
      <div className="pb-1">
        <p className="text-[10.5px] font-medium">{title}</p>
        <p className="mt-0.5 text-[9px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
