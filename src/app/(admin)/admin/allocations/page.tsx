import Link from "next/link";
import { ArrowUpRight, Network, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TableWrap, Table, THead, TH, TBody, TR, TD, TableContainer } from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminAllocations } from "@/server/data/admin";
import { allocationStatusMeta } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAllocationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const status = first(params.status) ?? "all";
  const allocations = await getAdminAllocations({ q, status });
  const counts = {
    active: allocations.filter((a) => a.status === "active").length,
    expired: allocations.filter((a) => a.status === "expired").length,
    interrupted: allocations.filter((a) => a.status === "interrupted").length,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Allocations"
        description="Every customer entitlement, with the proxy it was assigned to. Seat capacity is enforced per inventory item."
      />

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {Object.entries(counts).map(([key, value]) => (
          <div key={key} className="surface-card rounded-[11px] p-3">
            <p className="text-[9px] capitalize text-muted-foreground">{key}</p>
            <p className="tabular mt-1.5 text-[18px] font-semibold leading-none">{value}</p>
          </div>
        ))}
      </div>

      <form method="get" className="surface-card mt-3 flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Username, inventory or order number" className="h-9 pl-8 text-[11.5px]" aria-label="Search allocations" />
        </div>
        <Select name="status" defaultValue={status} className="h-9 sm:w-[170px]" aria-label="Filter allocation status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="interrupted">Interrupted</option>
          <option value="revoked">Revoked</option>
        </Select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Filter</button>
        <Link href="/admin/allocations" className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-[10px] text-muted-foreground">Reset</Link>
      </form>

      {allocations.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={Network} title="No allocations found" description="Once customers buy proxy plans, allocations appear here." />
        </div>
      ) : (
        <TableWrap className="mt-3">
          <TableContainer>
            <Table className="min-w-[900px]">
              <THead>
                <TR>
                  <TH>Customer</TH><TH>Product</TH><TH>Inventory</TH><TH>Status</TH><TH>Activated</TH><TH>Expires</TH><TH>Order</TH><TH />
                </TR>
              </THead>
              <TBody>
                {allocations.map((allocation) => {
                  const meta = allocationStatusMeta(allocation.status);
                  return (
                    <TR key={allocation.id}>
                      <TD>
                        <Link href={`/admin/users/${allocation.userId}`} className="font-medium hover:underline">{allocation.username}</Link>
                      </TD>
                      <TD>{allocation.productName}</TD>
                      <TD>
                        <Link href={`/admin/inventory/${allocation.inventoryId}`} className="text-[10px] text-muted-foreground hover:text-foreground">
                          {allocation.inventoryLabel}
                        </Link>
                        <p className="text-[8.5px] text-muted-foreground">{allocation.region ?? "No region"}</p>
                      </TD>
                      <TD><Badge tone={meta.tone}>{meta.label}</Badge></TD>
                      <TD className="text-[9px] text-muted-foreground">{formatDateTime(allocation.activatedAt)}</TD>
                      <TD className="text-[9px] text-muted-foreground">{formatDateTime(allocation.expiresAt)}</TD>
                      <TD>
                        <Link href={`/admin/orders/${allocation.orderId}`} className="font-mono text-[8.5px] text-muted-foreground hover:text-foreground">{allocation.orderNumber}</Link>
                      </TD>
                      <TD>
                        <Link href={`/admin/orders/${allocation.orderId}`} aria-label="Open order" className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground">
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
        </TableWrap>
      )}
    </div>
  );
}
