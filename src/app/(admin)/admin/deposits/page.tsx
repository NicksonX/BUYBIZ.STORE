import Link from "next/link";
import { ArrowUpRight, CreditCard, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdminActionForm } from "@/components/admin/action-form";
import { TableWrap, Table, THead, TH, TBody, TR, TD, TableContainer } from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminDeposits } from "@/server/data/admin";
import { verifyDepositAction } from "@/server/actions/admin";
import { getPageParam } from "@/lib/pagination";
import { depositStatusMeta } from "@/lib/status";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const status = first(params.status) ?? "all";
  const { page, pageSize } = getPageParam(first(params.page), 20);
  const { items, total } = await getAdminDeposits({ q, status, page, pageSize });

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Deposits"
        description="Wallet deposits are liabilities, not revenue. Credit happens only after server-side payment verification."
      />

      <form method="get" className="surface-card mt-4 flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Reference, username or email" className="h-9 pl-8 text-[11.5px]" aria-label="Search deposits" />
        </div>
        <Select name="status" defaultValue={status} className="h-9 sm:w-[170px]" aria-label="Filter deposit status">
          <option value="all">All statuses</option>
          <option value="credited">Credited</option>
          <option value="successful">Verified</option>
          <option value="pending">Pending</option>
          <option value="initiated">Initiated</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
          <option value="reversed">Reversed</option>
        </Select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Filter</button>
        <Link href="/admin/deposits" className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-[10px] text-muted-foreground">Reset</Link>
      </form>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={CreditCard} title="No deposits match" description="Try another search or status filter." />
        </div>
      ) : (
        <TableWrap className="mt-3">
          <TableContainer>
            <Table className="min-w-[980px]">
              <THead>
                <TR><TH>Reference</TH><TH>Customer</TH><TH>Amount</TH><TH>Status</TH><TH>Provider</TH><TH>Fee</TH><TH>Created</TH><TH>Action</TH></TR>
              </THead>
              <TBody>
                {items.map((deposit) => {
                  const meta = depositStatusMeta(deposit.status);
                  const canVerify =
                    deposit.provider === "paystack" &&
                    ["pending", "initiated"].includes(deposit.status);
                  return (
                    <TR key={deposit.id}>
                      <TD>
                        <p className="max-w-[190px] truncate font-mono text-[8.5px]" title={deposit.providerReference}>{deposit.providerReference}</p>
                        {deposit.provider === "demo" ? <Badge tone="warning" className="mt-1 text-[8px]">Demo</Badge> : null}
                      </TD>
                      <TD>
                        <Link href={`/admin/users/${deposit.userId}`} className="font-medium hover:underline">{deposit.username}</Link>
                        <p className="mt-0.5 text-[8.5px] text-muted-foreground">{deposit.email}</p>
                      </TD>
                      <TD className="tabular">{formatNaira(deposit.amountMinor, { exact: true })}</TD>
                      <TD><Badge tone={meta.tone}>{meta.label}</Badge></TD>
                      <TD className="text-[9.5px] uppercase">{deposit.provider}</TD>
                      <TD className="tabular text-[9.5px]">{formatNaira(deposit.gatewayFeeMinor, { exact: true })}</TD>
                      <TD className="text-[9px] text-muted-foreground">{formatDateTime(deposit.createdAt)}</TD>
                      <TD>
                        {canVerify ? (
                          <AdminActionForm
                            action={verifyDepositAction}
                            hidden={{ depositId: deposit.id, reference: deposit.providerReference }}
                            submitLabel="Verify"
                            pendingLabel="Checking…"
                            variant="outline"
                            compact
                            className="inline-flex"
                            confirmMessage="Verify this payment with Paystack and credit the wallet if successful?"
                          />
                        ) : (
                          <span className="text-[9px] text-muted-foreground">No action</span>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
          <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/deposits" params={{ q: q || undefined, status }} />
        </TableWrap>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
        <CreditCard className="mt-0.5 h-3 w-3 shrink-0" />
        Pending Paystack deposits can be re-verified here. The verification checks
        status, amount, currency and reference on the server. A successful payment
        creates exactly one wallet credit. Demo deposits cannot be credited from
        this page.
      </div>
    </div>
  );
}
