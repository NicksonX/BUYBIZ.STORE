import Link from "next/link";
import { Search, Network, ReceiptText, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUserPage } from "@/server/auth/guards";
import { searchCustomerData } from "@/server/data/customer";
import { orderStatusMeta, titleCase } from "@/lib/status";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUserPage();
  const params = await searchParams;
  const q = (first(params.q) ?? "").trim();
  const results = q.length >= 2 ? await searchCustomerData(user.id, q) : null;
  const total = results
    ? results.orders.length + results.allocations.length + results.tickets.length
    : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Search"
        title="Find something in your account."
        description="Search your own orders, proxy allocations and support tickets. Other customers' records are never included."
      />

      <form action="/dashboard/search" method="get" className="mt-4 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Order number, product, region or ticket subject"
            autoFocus
            className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-3 text-[12px] outline-none focus:border-foreground/30 focus:ring-4 focus:ring-foreground/[0.05]"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-full bg-foreground px-5 text-[11px] font-semibold text-background"
        >
          Search
        </button>
      </form>

      {!q || q.length < 2 ? (
        <div className="mt-5">
          <EmptyState
            icon={Search}
            title="Search your BUYBIZ account"
            description="Enter at least two characters. Try an order number (BZ-…), a plan name, a proxy region or a ticket subject."
          />
        </div>
      ) : total === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={Search}
            title={`No results for “${q}”`}
            description="Try a shorter search term or a different order reference."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {results?.orders.length ? (
            <section className="surface-card overflow-hidden rounded-[14px]">
              <div className="border-b border-border bg-surface-subtle/60 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Orders
              </div>
              <div className="divide-y divide-border">
                {results.orders.map((order) => {
                  const meta = orderStatusMeta(order.status);
                  return (
                    <Link
                      key={order.id}
                      href={`/dashboard/orders/${order.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <ReceiptText className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-[10.5px] font-medium">{order.productName}</p>
                          <p className="mt-0.5 font-mono text-[8.5px] text-muted-foreground">
                            {order.orderNumber} · {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular text-[10px] font-medium">
                          {formatNaira(order.amountMinor, { exact: true })}
                        </span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          {results?.allocations.length ? (
            <section className="surface-card overflow-hidden rounded-[14px]">
              <div className="border-b border-border bg-surface-subtle/60 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Proxy allocations
              </div>
              <div className="divide-y divide-border">
                {results.allocations.map((allocation) => (
                  <Link
                    key={allocation.id}
                    href={`/dashboard/proxies/${allocation.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <Network className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10.5px] font-medium">
                          {allocation.productName}
                        </p>
                        <p className="mt-0.5 text-[8.5px] text-muted-foreground">
                          {allocation.proxyLabel} · expires{" "}
                          {formatDateTime(allocation.expiresAt)}
                        </p>
                      </div>
                    </div>
                    <Badge tone="neutral" className="capitalize">
                      {allocation.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {results?.tickets.length ? (
            <section className="surface-card overflow-hidden rounded-[14px]">
              <div className="border-b border-border bg-surface-subtle/60 px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Support tickets
              </div>
              <div className="divide-y divide-border">
                {results.tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/dashboard/support/${ticket.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <LifeBuoy className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-[10.5px] font-medium">{ticket.subject}</p>
                        <p className="mt-0.5 font-mono text-[8.5px] text-muted-foreground">
                          {ticket.ticketNumber} · {formatDateTime(ticket.lastMessageAt)}
                        </p>
                      </div>
                    </div>
                    <Badge tone="neutral">{titleCase(ticket.status)}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
