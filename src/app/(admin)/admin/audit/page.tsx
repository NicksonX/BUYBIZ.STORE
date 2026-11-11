import Link from "next/link";
import { FileClock, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { TableWrap, Table, THead, TH, TBody, TR, TD, TableContainer } from "@/components/ui/table";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminAudit } from "@/server/data/admin";
import { getPageParam } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const action = first(params.action) ?? "all";
  const { page, pageSize } = getPageParam(first(params.page), 25);
  const { items, total } = await getAdminAudit({ q, action, page, pageSize });

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Audit log"
        description="Append-only records of sensitive admin actions. Credentials and secrets are never written into this log."
      />
      <form method="get" className="surface-card mt-4 flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Action, entity or admin username" className="h-9 pl-8 text-[11.5px]" aria-label="Search audit log" />
        </div>
        <Select name="action" defaultValue={action} className="h-9 sm:w-[200px]" aria-label="Filter action">
          <option value="all">All actions</option>
          <option value="inventory.created">Inventory created</option>
          <option value="inventory.credentials_revealed">Credential revealed</option>
          <option value="inventory.credentials_rotated">Credential rotated</option>
          <option value="wallet.admin_credit">Admin credit</option>
          <option value="wallet.admin_debit">Admin debit</option>
          <option value="user.suspended">User suspended</option>
          <option value="settings.updated">Settings updated</option>
          <option value="order.refunded_auto">Automatic refund</option>
          <option value="deposit.credited">Deposit credited</option>
          <option value="referral.rewarded">Referral rewarded</option>
          <option value="ai.support_security_flag">AI security flag</option>
        </Select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Filter</button>
        <Link href="/admin/audit" className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-[10px] text-muted-foreground">Reset</Link>
      </form>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={FileClock} title="No audit entries match" description="Try a different filter." />
        </div>
      ) : (
        <TableWrap className="mt-3">
          <TableContainer>
            <Table className="min-w-[980px]">
              <THead>
                <TR><TH>Time</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH><TH>Metadata</TH><TH>IP</TH></TR>
              </THead>
              <TBody>
                {items.map((entry) => (
                  <TR key={entry.id}>
                    <TD className="whitespace-nowrap text-[9px] text-muted-foreground">{formatDateTime(entry.createdAt)}</TD>
                    <TD>
                      {entry.actorUserId ? (
                        <Link href={`/admin/users/${entry.actorUserId}`} className="font-medium hover:underline">{entry.actorUsername ?? "Unknown"}</Link>
                      ) : (
                        <span className="text-[9.5px]">System</span>
                      )}
                      <p className="mt-0.5 text-[8px] capitalize text-muted-foreground">{entry.actorRole ?? "system"}</p>
                    </TD>
                    <TD><Badge tone="outline">{entry.action}</Badge></TD>
                    <TD className="text-[9px] text-muted-foreground">
                      {entry.entityType}
                      {entry.entityId ? <p className="mt-0.5 font-mono text-[7.5px]">{entry.entityId.slice(0, 14)}…</p> : null}
                    </TD>
                    <TD>
                      <details>
                        <summary className="max-w-[230px] cursor-pointer truncate font-mono text-[7.5px] text-muted-foreground">
                          {JSON.stringify(entry.metadata).slice(0, 60)}
                        </summary>
                        <pre className="mt-1 max-w-[300px] whitespace-pre-wrap break-all rounded bg-surface-subtle p-2 font-mono text-[7.5px] text-muted-foreground">
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </details>
                    </TD>
                    <TD className="text-[8.5px] text-muted-foreground">{entry.ipAddress ?? "None"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
          <Pagination page={page} pageSize={pageSize} total={total} basePath="/admin/audit" params={{ q: q || undefined, action }} />
        </TableWrap>
      )}
    </div>
  );
}
