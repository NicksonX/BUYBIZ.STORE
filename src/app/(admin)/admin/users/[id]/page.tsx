import { notFound } from "next/navigation";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import {
  ArrowUpRight,
  BadgeCheck,
  Network,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TableWrap, Table, THead, TH, TBody, TR, TD, TableContainer } from "@/components/ui/table";
import { StatCard } from "@/components/ui/stat-card";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminUserDetail } from "@/server/data/admin";
import {
  adjustWalletAction,
  changeRoleAction,
  reactivateUserAction,
  suspendUserAction,
} from "@/server/actions/admin";
import { orderStatusMeta, allocationStatusMeta, ticketStatusMeta } from "@/lib/status";
import {
  formatDate,
  formatDateTime,
  formatNaira,
  formatSignedNaira,
  truncateMiddle,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdminPage();
  const data = await getAdminUserDetail(id);
  if (!data) notFound();
  const { profile, wallet, orders, allocations, tickets, ledger, audit } = data;
  const isSelf = admin.id === profile.id;
  const canManageRole = admin.role === "super_admin" && !isSelf;
  const adjustmentKey = randomUUID();

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/admin/users"
        backLabel="Back to users"
        eyebrow="User"
        title={profile.displayName || profile.username}
        description={`@${profile.username} · ${profile.email} · joined ${formatDate(profile.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                profile.status === "active"
                  ? "success"
                  : profile.status === "suspended"
                    ? "danger"
                    : "warning"
              }
              className="capitalize"
            >
              {profile.status.replace("_", " ")}
            </Badge>
            <Badge tone="neutral" className="capitalize">
              {profile.role.replace("_", " ")}
            </Badge>
            {profile.emailVerified ? (
              <Badge tone="success">
                <BadgeCheck className="h-3 w-3" /> Email verified
              </Badge>
            ) : (
              <Badge tone="warning">Email unverified</Badge>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Wallet balance" value={formatNaira(wallet.balanceMinor, { exact: true })} icon={Wallet} hint="Current ledger balance" />
        <StatCard label="Deposits" value={formatNaira(wallet.totalDeposits, { exact: true })} icon={Wallet} hint="All credited" />
        <StatCard label="Purchase debits" value={formatNaira(wallet.totalSpent, { exact: true })} icon={Network} hint="Gross purchase debits" />
        <StatCard label="Refunds" value={formatNaira(wallet.totalRefunds, { exact: true })} icon={Wallet} hint="Wallet credits" />
      </div>

      {profile.status === "frozen" ? (
        <div className="rounded-[10px] border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[9.5px] leading-4 text-warning">
          Frozen for inactivity. Last activity: {formatDateTime(profile.lastActivityAt)}. Frozen: {formatDateTime(profile.frozenAt)}. Wallet balance is preserved above.
          {profile.freezeReason ? ` Reason: ${profile.freezeReason}.` : ""}
        </div>
      ) : null}

      <div className="grid items-start gap-3 xl:grid-cols-[1fr_1fr]">
        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Account actions</h2>
          <p className="mt-1 text-[9.5px] text-muted-foreground">
            Actions are audited. You cannot edit a wallet balance directly.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {profile.status === "suspended" || profile.status === "frozen" ? (
              <AdminActionForm
                action={reactivateUserAction}
                hidden={{ userId: profile.id }}
                submitLabel={profile.status === "frozen" ? "Unfreeze account" : "Reactivate account"}
                variant="outline"
                pendingLabel="Reactivating…"
                confirmMessage={profile.status === "frozen" ? "Unfreeze this account and waive the reactivation fee?" : "Reactivate this account?"}
              >
                <AdminField label="Reason for reactivation" htmlFor="reactivate-reason">
                  <Textarea id="reactivate-reason" name="reason" required minLength={5} className="min-h-20 text-[11px]" placeholder="e.g. Support resolved the account issue" />
                </AdminField>
              </AdminActionForm>
            ) : (
              <AdminActionForm
                action={suspendUserAction}
                hidden={{ userId: profile.id }}
                submitLabel="Suspend account"
                variant="danger"
                pendingLabel="Suspending…"
                confirmMessage="Suspend this account? The customer will lose purchasing access."
              >
                <AdminField label="Reason for suspension" htmlFor="suspend-reason">
                  <Textarea id="suspend-reason" name="reason" required minLength={5} className="min-h-20 text-[11px]" placeholder="Visible to the customer in their notification" />
                </AdminField>
              </AdminActionForm>
            )}

            {canManageRole ? (
              <AdminActionForm
                action={changeRoleAction}
                hidden={{ userId: profile.id }}
                submitLabel="Change role"
                variant="outline"
                pendingLabel="Updating…"
                confirmMessage="Change this user's role? Role permissions apply immediately."
              >
                <AdminField label="Role" htmlFor="role">
                  <Select id="role" name="role" defaultValue={profile.role}>
                    <option value="customer">Customer</option>
                    <option value="support">Support</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super admin</option>
                  </Select>
                </AdminField>
                <label className="flex items-center gap-2 text-[9.5px] text-muted-foreground">
                  <input type="checkbox" name="confirm" required className="h-3.5 w-3.5 accent-foreground" />
                  I understand this changes account permissions.
                </label>
              </AdminActionForm>
            ) : (
              <AdminNote>
                {isSelf
                  ? "You cannot change your own role or suspend yourself."
                  : "Only a super admin can change roles."}
              </AdminNote>
            )}
          </div>
        </section>

        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Wallet adjustment</h2>
          <p className="mt-1 text-[9.5px] text-muted-foreground">
            Creates an immutable ledger entry with a reason and audit event. Debits cannot take the balance below zero.
          </p>
          <div className="mt-4">
            <AdminActionForm
              action={adjustWalletAction}
              hidden={{ userId: profile.id, adjustmentKey }}
              submitLabel="Record adjustment"
              pendingLabel="Recording…"
              confirmMessage="Apply this wallet adjustment? This cannot be deleted."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Direction" htmlFor="direction">
                  <Select id="direction" name="direction" defaultValue="credit">
                    <option value="credit">Credit wallet</option>
                    <option value="debit">Debit wallet</option>
                  </Select>
                </AdminField>
                <AdminField label="Amount (NGN)" htmlFor="adjust-amount">
                  <Input id="adjust-amount" name="amount" inputMode="decimal" required placeholder="5000" />
                </AdminField>
              </div>
              <AdminField label="Reason" htmlFor="adjust-reason">
                <Textarea id="adjust-reason" name="reason" required minLength={8} className="min-h-20 text-[11px]" placeholder="Explain why this adjustment is needed" />
              </AdminField>
              <label className="flex items-start gap-2 text-[9.5px] leading-4 text-muted-foreground">
                <input type="checkbox" name="confirm" required className="mt-0.5 h-3.5 w-3.5 accent-foreground" />
                I confirm this financial action and understand it will appear in the audit log.
              </label>
            </AdminActionForm>
          </div>
        </section>
      </div>

      <section className="surface-card overflow-hidden rounded-[14px]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Recent orders</h2>
          <Link href={`/admin/orders?q=${encodeURIComponent(profile.username)}`} className="text-[9.5px] text-muted-foreground hover:text-foreground">
            All orders <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {orders.length ? (
          <TableContainer>
            <Table className="min-w-[700px]">
              <THead><TR><TH>Order</TH><TH>Product</TH><TH>Amount</TH><TH>Status</TH><TH>Date</TH></TR></THead>
              <TBody>
                {orders.slice(0, 8).map((order) => {
                  const meta = orderStatusMeta(order.status);
                  return (
                    <TR key={order.id}>
                      <TD>
                        <Link href={`/admin/orders/${order.id}`} className="font-mono text-[9px] hover:underline">
                          {order.orderNumber}
                        </Link>
                      </TD>
                      <TD>{order.productName}</TD>
                      <TD className="tabular">{formatNaira(order.amountMinor, { exact: true })}</TD>
                      <TD><Badge tone={meta.tone}>{meta.label}</Badge></TD>
                      <TD className="text-[9.5px] text-muted-foreground">{formatDateTime(order.createdAt)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
        ) : (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No orders yet.</p>
        )}
      </section>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        <section className="surface-card overflow-hidden rounded-[14px]">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[12px] font-semibold">Proxy allocations</h2>
          </div>
          {allocations.length ? (
            <TableContainer>
              <Table className="min-w-[620px]">
                <THead><TR><TH>Product</TH><TH>Inventory</TH><TH>Status</TH><TH>Expires</TH></TR></THead>
                <TBody>
                  {allocations.slice(0, 8).map((allocation) => {
                    const meta = allocationStatusMeta(allocation.status);
                    return (
                      <TR key={allocation.id}>
                        <TD>{allocation.productName}</TD>
                        <TD className="text-[9.5px] text-muted-foreground">{allocation.inventoryLabel}</TD>
                        <TD><Badge tone={meta.tone}>{meta.label}</Badge></TD>
                        <TD className="text-[9.5px] text-muted-foreground">{formatDateTime(allocation.expiresAt)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableContainer>
          ) : (
            <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No proxy allocations.</p>
          )}
        </section>

        <section className="surface-card overflow-hidden rounded-[14px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[12px] font-semibold">Support tickets</h2>
            <Link href={`/admin/support?q=${encodeURIComponent(profile.username)}`} className="text-[9.5px] text-muted-foreground hover:text-foreground">
              Support
            </Link>
          </div>
          {tickets.length ? (
            <div className="divide-y divide-border">
              {tickets.slice(0, 6).map((ticket) => {
                const meta = ticketStatusMeta(ticket.status);
                return (
                  <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle/50">
                    <div className="min-w-0">
                      <p className="truncate text-[10.5px] font-medium">{ticket.subject}</p>
                      <p className="mt-0.5 text-[8.5px] text-muted-foreground">{ticket.ticketNumber} · {ticket.messageCount} messages</p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No tickets.</p>
          )}
        </section>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        <section className="surface-card overflow-hidden rounded-[14px]">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[12px] font-semibold">Wallet entries</h2>
          </div>
          <div className="divide-y divide-border">
            {ledger.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[10px]">{entry.description}</p>
                  <p className="mt-0.5 font-mono text-[8px] text-muted-foreground">{truncateMiddle(entry.reference, 14, 5)}</p>
                </div>
                <span className={`tabular text-[10px] font-medium ${entry.amountMinor > 0 ? "text-success" : "text-foreground"}`}>
                  {formatSignedNaira(entry.amountMinor)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card overflow-hidden rounded-[14px]">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-[12px] font-semibold">Admin trail</h2>
          </div>
          <div className="divide-y divide-border">
            {audit.length ? audit.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
                <div>
                  <p className="text-[10px] font-medium">{entry.action}</p>
                  <p className="mt-0.5 text-[8.5px] text-muted-foreground">{entry.entityType} · {entry.createdAt ? formatDateTime(entry.createdAt) : ""}</p>
                </div>
                <Badge tone="neutral">{entry.actorRole ?? "system"}</Badge>
              </div>
            )) : (
              <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No audit actions for this user.</p>
            )}
          </div>
        </section>
      </div>

      <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
        Do not share wallet balances, credentials or personal data outside authorized support. Admin actions here are recorded with actor and IP metadata.
      </div>
    </div>
  );
}
