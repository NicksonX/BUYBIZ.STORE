import Link from "next/link";
import { ArrowUpRight, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { TableWrap, Table, THead, TH, TBody, TR, TD, TableContainer } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminUsers } from "@/server/data/admin";
import { getPageParam } from "@/lib/pagination";
import { formatDate, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const roleTone = {
  customer: "neutral",
  support: "info",
  admin: "warning",
  super_admin: "solid",
} as const;

const statusTone = {
  active: "success",
  suspended: "danger",
  pending_verification: "warning",
} as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const role = first(params.role) ?? "all";
  const status = first(params.status) ?? "all";
  const { page, pageSize } = getPageParam(first(params.page), 20);
  const { items, total } = await getAdminUsers({ q, role, status, page, pageSize });

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Search customers and staff. Wallet balances come from the ledger, not an editable field."
      />

      <form
        method="get"
        className="surface-card mt-4 flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search username or email"
            className="h-9 pl-8 text-[11.5px]"
            aria-label="Search users"
          />
        </div>
        <Select name="role" defaultValue={role} className="h-9 sm:w-[150px]" aria-label="Filter role">
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="support">Support</option>
          <option value="admin">Admins</option>
          <option value="super_admin">Super admins</option>
        </Select>
        <Select name="status" defaultValue={status} className="h-9 sm:w-[160px]" aria-label="Filter status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending_verification">Pending verification</option>
        </Select>
        <button
          type="submit"
          className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background"
        >
          Filter
        </button>
        <Link
          href="/admin/users"
          className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-[10px] text-muted-foreground hover:bg-accent"
        >
          Reset
        </Link>
      </form>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Users}
            title="No users match this filter"
            description="Try a different search or clear the filters."
          />
        </div>
      ) : (
        <TableWrap className="mt-4">
          <TableContainer>
            <Table className="min-w-[820px]">
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH>Wallet</TH>
                  <TH>Orders</TH>
                  <TH>Active</TH>
                  <TH>Joined</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {items.map((user) => (
                  <TR key={user.id}>
                    <TD>
                      <Link href={`/admin/users/${user.id}`} className="group block">
                        <p className="font-medium group-hover:underline">{user.username}</p>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">{user.email}</p>
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone={roleTone[user.role]} className="capitalize">
                        {user.role.replace("_", " ")}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge tone={statusTone[user.status as keyof typeof statusTone] ?? "neutral"} className="capitalize">
                        {user.status.replace("_", " ")}
                      </Badge>
                    </TD>
                    <TD className="tabular">{formatNaira(user.balanceMinor, { exact: true })}</TD>
                    <TD className="tabular">{user.orderCount}</TD>
                    <TD className="tabular">{user.activeProxies}</TD>
                    <TD className="text-[9.5px] text-muted-foreground">{formatDate(user.createdAt)}</TD>
                    <TD>
                      <Link
                        href={`/admin/users/${user.id}`}
                        aria-label={`View ${user.username}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath="/admin/users"
            params={{ q: q || undefined, role, status }}
          />
        </TableWrap>
      )}
    </div>
  );
}
