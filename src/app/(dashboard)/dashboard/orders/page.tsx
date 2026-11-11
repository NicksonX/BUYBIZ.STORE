import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Network,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { requireUserPage } from "@/server/auth/guards";
import { getOrdersForUser } from "@/server/data/customer";
import { orderStatusMeta } from "@/lib/status";
import { cn, formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

const filters = [
  { key: "all", label: "All orders" },
  { key: "completed", label: "Completed" },
  { key: "refunded", label: "Refunded" },
] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const activeFilter = filters.some((filter) => filter.key === raw)
    ? (raw as (typeof filters)[number]["key"])
    : "all";

  const orders = await getOrdersForUser(user.id);
  const filtered =
    activeFilter === "all"
      ? orders
      : orders.filter((order) => order.status === activeFilter);

  return (
    <div>
      <PageHeader
        eyebrow="My orders"
        title="Your orders."
        description="Each order connects to its wallet entries and, when it worked, its proxy."
        actions={
          <Link
            href="/dashboard/marketplace"
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "h-9 rounded-full px-4",
            )}
          >
            Buy a proxy
          </Link>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => (
          <Link
            key={filter.key}
            href={
              filter.key === "all"
                ? "/dashboard/orders"
                : `/dashboard/orders?status=${filter.key}`
            }
            className={cn(
              "tap-target inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[11.5px] font-medium transition-colors sm:min-h-7 sm:text-[10.5px]",
              activeFilter === filter.key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
            <span
              className={cn(
                "text-[9px]",
                activeFilter === filter.key ? "text-background/55" : "text-muted-foreground/60",
              )}
            >
              {filter.key === "all"
                ? orders.length
                : orders.filter((order) => order.status === filter.key).length}
            </span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={ShoppingBag}
            title={activeFilter === "all" ? "No orders yet" : `No ${activeFilter} orders`}
            description={
              activeFilter === "all"
                ? "Your proxy purchases will appear here with their wallet trail and allocation status."
                : "There are no orders with this status. Try another filter."
            }
            action={
              <Link
                href="/dashboard/marketplace"
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "rounded-full px-4",
                )}
              >
                Browse proxy plans
              </Link>
            }
          />
        </div>
      ) : (
        <div className="surface-card mt-4 overflow-hidden rounded-[15px]">
          <div className="hidden grid-cols-[1.7fr_0.8fr_0.7fr_0.7fr_24px] gap-3 border-b border-border bg-surface-subtle/60 px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:grid">
            <span>Order</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {filtered.map((order) => {
              const meta = orderStatusMeta(order.status);
              return (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block px-4 py-3.5 transition-colors hover:bg-surface-subtle/60"
                >
                  <div className="hidden grid-cols-[1.7fr_0.8fr_0.7fr_0.7fr_24px] items-center gap-3 md:grid">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                        {order.status === "refunded" ? (
                          <RotateCcw className="h-3.5 w-3.5 text-warning" />
                        ) : (
                          <Network className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-medium">
                          {order.productName}
                        </p>
                        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                          {order.orderNumber}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </p>
                    <p className="tabular text-[11.5px] font-semibold">
                      {formatNaira(order.amountMinor, { exact: true })}
                    </p>
                    <div>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    {order.status === "refunded" ? (
                      <p className="col-span-4 text-[9.5px] leading-4 text-warning">
                        Refunded to BUYBIZ balance. No proxy was available.
                      </p>
                    ) : null}
                  </div>

                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-border bg-surface-subtle">
                          {order.status === "refunded" ? (
                            <RotateCcw className="h-4 w-4 text-warning" />
                          ) : (
                            <Network className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium">
                            {order.productName}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="tabular shrink-0 pt-0.5 text-[12px] font-semibold">
                        {formatNaira(order.amountMinor, { exact: true })}
                      </p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between pl-[46px]">
                      <p className="font-mono text-[9px] text-muted-foreground">
                        {order.orderNumber}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                    {order.status === "refunded" ? (
                      <p className="mt-2 pl-[46px] text-[10px] leading-4 text-warning">
                        Refunded to your wallet. No proxy was available.
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9.5px] leading-4 text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Completed orders have one immutable purchase debit. Refunded orders
          have a matching debit and refund credit, netting to zero, never a
          silent charge. Order status and financial entries cannot be edited
          from the browser.
        </p>
      </div>
    </div>
  );
}
