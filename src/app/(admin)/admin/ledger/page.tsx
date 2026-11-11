import Link from "next/link";
import { ArrowLeftRight, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { TableWrap, Table, THead, TH, TBody, TR, TD, TableContainer } from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminLedger } from "@/server/data/admin";
import { getPageParam } from "@/lib/pagination";
import { ledgerTypeLabel } from "@/lib/status";
import { cn, formatDateTime, formatNaira, formatSignedNaira, truncateMiddle } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const type = first(params.type) ?? "all";
  const { page, pageSize } = getPageParam(first(params.page), 25);
  const { items, total } = await getAdminLedger({ q, type, page, pageSize });

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Wallet ledger"
        description="The immutable source of truth for customer balances. Entries are append-only; corrections are new entries."
      />

      <form method="get" className="surface-card mt-4 flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Username, reference or order number" className="h-9 pl-8 text-[11.5px]" aria-label="Search ledger" />
        </div>
        <Select name="type" defaultValue={type} className="h-9 sm:w-[180px]" aria-label="Filter entry type">
          <option value="all">All entries</option>
          <option value="deposit_credit">Deposit credits</option>
          <option value="purchase_debit">Purchase debits</option>
          <option value="refund_credit">Refund credits</option>
          <option value="referral_credit">Referral rewards</option>
          <option value="admin_credit">Admin credits</option>
          <option value="admin_debit">Admin debits</option>
          <option value="reversal">Reversals</option>
        </Select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Filter</button>
        <Link href="/admin/ledger" className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-[10px] text-muted-foreground">Reset</Link>
      </form>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={ArrowLeftRight} title="No ledger entries match" description="Try another search or entry type." />
        </div>
      ) : (
        <TableWrap className="mt-3">
          <TableContainer>
            <Table className="min-w-[1020px]">
              <THead>
                <TR><TH>Customer</TH><TH>Type</TH><TH>Description</TH><TH>Amount</TH><TH>Balance after</TH><TH>Reference</TH><TH>Order</TH><TH>Date</TH></TR>
              </THead>
              <TBody>
                {items.map((entry) => (
                  <TR key={entry.id}>
                    <TD>
                      <Link href={`/admin/users/${entry.userId}`} className="font-medium hover:underline">{entry.username}</Link>
                      <p className="mt-0.5 text-[8.5px] text-muted-foreground">{entry.email}</p>
                    </TD>
                    <TD className="text-[9.5px]">{ledgerTypeLabel(entry.entryType)}</TD>
                    <TD className="max-w-[220px] truncate text-[9.5px]" title={entry.description}>{entry.description}</TD>
                    <TD className={cn("tabular text-[10px] font-medium", entry.amountMinor > 0 ? "text-success" : "text-foreground")}>
                      {formatSignedNaira(entry.amountMinor)}
                    </TD>
                    <TD className="tabular text-[9.5px]">{formatNaira(entry.balanceAfterMinor, { exact: true })}</TD>
                    <TD>
                      <p className="max-w-[160px] truncate font-mono text-[8px]" title={entry.reference}>{truncateMiddle(entry.reference, 14, 5)}</p>
                    </TD>
                    <TD>
                      {entry.orderNumber ? (
                        <Link href={`/admin/orders/${entry.relatedOrderId}`} className="font-mono text-[8.5px] text-muted-foreground hover:text-foreground">{entry.orderNumber}</Link>
                      ) : (
                        <span className="text-[8.5px] text-muted-foreground">Not linked</span>
                      )}
                    </TD>
                    <TD className="text-[9px] text-muted-foreground">{formatDateTime(entry.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
          <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/ledger" params={{ q: q || undefined, type }} />
        </TableWrap>
      )}
    </div>
  );
}
