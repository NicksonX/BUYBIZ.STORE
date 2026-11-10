import Link from "next/link";
import { ArrowUpRight, ReceiptText, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { TableWrap, Table, THead, TH, TBody, TR, TD, TableContainer } from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminOrders } from "@/server/data/admin";
import { getPageParam } from "@/lib/pagination";
import { orderStatusMeta } from "@/lib/status";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const status = first(params.status) ?? "all";
  const { page, pageSize } = getPageParam(first(params.page), 20);
  const { items, total } = await getAdminOrders({ q, status, page, pageSize });

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Orders"
        description="Every purchase attempt, including automatic no-stock refunds. Order amounts cannot be edited from the browser."
      />
      <form method="get" className="surface-card mt-4 flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Order number, username or email" className="h-9 pl-8 text-[11.5px]" aria-label="Search orders" />
        </div>
        <Select name="status" defaultValue={status} className="h-9 sm:w-[160px]" aria-label="Filter order status">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="unfulfilled">Unfulfilled</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Filter</button>
        <Link href="/admin/orders" className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-[10px] text-muted-foreground">Reset</Link>
      </form>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={ReceiptText} title="No orders match" description="Try a different search or status filter." />
        </div>
      ) : (
        <TableWrap className="mt-3">
          <TableContainer>
            <Table className="min-w-[940px]">
              <THead>
                <TR><TH>Order</TH><TH>Customer</TH><TH>Product</TH><TH>Amount</TH><TH>Status</TH><TH>Created</TH><TH>Allocation</TH><TH /></TR>
              </THead>
              <TBody>
                {items.map((order) => {
                  const meta = orderStatusMeta(order.status);
                  return (
                    <TR key={order.id}>
                      <TD>
                        <Link href={`/admin/orders/${order.id}`} className="font-mono text-[9px] font-medium hover:underline">{order.orderNumber}</Link>
                        {order.failureReason ? <p className="mt-0.5 text-[8px] text-warning">{order.failureReason}</p> : null}
                      </TD>
                      <TD>
                        <Link href={`/admin/users/${order.userId}`} className="font-medium hover:underline">{order.username}</Link>
                        <p className="mt-0.5 text-[8.5px] text-muted-foreground">{order.email}</p>
                      </TD>
                      <TD>{order.productName}</TD>
                      <TD className="tabular">{formatNaira(order.amountMinor, { exact: true })}</TD>
                      <TD><Badge tone={meta.tone}>{meta.label}</Badge></TD>
                      <TD className="text-[9px] text-muted-foreground">{formatDateTime(order.createdAt)}</TD>
                      <TD className="text-[9px] text-muted-foreground">{order.allocationId ? "Allocated" : "None"}</TD>
                      <TD>
                        <Link href={`/admin/orders/${order.id}`} aria-label="View order" className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground">
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
          <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/orders" params={{ q: q || undefined, status }} />
        </TableWrap>
      )}
    </div>
  );
}
