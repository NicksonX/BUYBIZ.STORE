import Link from "next/link";
import { Search, Users, ReceiptText, LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminSearch } from "@/server/data/admin";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = (first(params.q) ?? "").trim();
  const results = q.length >= 2 ? await getAdminSearch(q) : null;
  const total = results
    ? results.users.length + results.orders.length + results.tickets.length
    : 0;

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Search" description="Find a user, order or support ticket across the platform." />
      <form method="get" className="surface-card mt-4 flex gap-2 rounded-[12px] p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Username, email, order number or ticket" className="h-9 pl-8 text-[11.5px]" aria-label="Search admin records" autoFocus />
        </div>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Search</button>
      </form>

      {!q || q.length < 2 ? (
        <div className="mt-4">
          <EmptyState icon={Search} title="Search the admin database" description="Enter at least two characters. Results are limited to five per category." />
        </div>
      ) : total === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Search} title={`No results for “${q}”`} description="Try a different username, order number or ticket reference." />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {results?.users.length ? (
            <section className="surface-card overflow-hidden rounded-[13px]">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <Users className="h-3 w-3" /> Users
              </div>
              <div className="divide-y divide-border">
                {results.users.map((user) => (
                  <Link key={user.id} href={`/admin/users/${user.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-surface-subtle/60">
                    <span className="text-[10.5px] font-medium">{user.username}</span>
                    <span className="text-[9px] text-muted-foreground">{user.email}</span>
                    <Badge tone="neutral" className="capitalize">{user.role.replace("_", " ")}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {results?.orders.length ? (
            <section className="surface-card overflow-hidden rounded-[13px]">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <ReceiptText className="h-3 w-3" /> Orders
              </div>
              <div className="divide-y divide-border">
                {results.orders.map((order) => (
                  <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-surface-subtle/60">
                    <span className="font-mono text-[9px]">{order.orderNumber}</span>
                    <span className="text-[9.5px]">{order.username}</span>
                    <span className="tabular text-[10px] font-medium">{formatNaira(order.amountMinor, { exact: true })}</span>
                    <Badge tone="neutral" className="capitalize">{order.status}</Badge>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
          {results?.tickets.length ? (
            <section className="surface-card overflow-hidden rounded-[13px]">
              <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <LifeBuoy className="h-3 w-3" /> Tickets
              </div>
              <div className="divide-y divide-border">
                {results.tickets.map((ticket) => (
                  <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-surface-subtle/60">
                    <span className="text-[10px] font-medium">{ticket.subject}</span>
                    <span className="font-mono text-[8.5px] text-muted-foreground">{ticket.ticketNumber}</span>
                    <Badge tone="neutral" className="capitalize">{ticket.status}</Badge>
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
