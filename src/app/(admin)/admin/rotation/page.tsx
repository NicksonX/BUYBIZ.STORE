import Link from "next/link";
import { ArrowUpRight, Clock3, KeyRound, RefreshCw, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CredentialsPanel } from "@/components/admin/credentials-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminRotationOverview } from "@/server/data/admin";
import { formatDateTime, remainingParts } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminRotationPage() {
  await requireAdminPage();
  const { inventory, history, customers } = await getAdminRotationOverview();
  const customersFor = (id: string) => customers.filter((customer) => customer.inventoryId === id);
  const daily = inventory.filter((item) => item.productSlug === "proxy-24-hours");
  const weekly = inventory.filter((item) => item.productSlug === "proxy-7-days");

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Credential rotation"
        description="Manual upstream credential changes for daily and weekly shared proxies. This updates what BUYBIZ stores; it does not change credentials at the provider for you."
        actions={
          <Link href="/admin/notifications" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3.5 text-[10px] font-medium hover:bg-accent">
            <Clock3 className="h-3 w-3" /> Reminders
          </Link>
        }
      />

      <div className="flex items-start gap-2 rounded-[10px] border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[9.5px] leading-4 text-warning">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Each category has a shared upstream login. Rotating it can affect every active customer on that inventory. The new credentials become visible to active customers immediately, while each customer keeps their original expiry. The provider may invalidate the old login; BUYBIZ cannot perform that upstream change. Create a new inventory record with new credentials for new sales if you do not want to affect the current cohort.
        </p>
      </div>

      {inventory.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No daily or weekly inventory"
          description="Add 24-hour or 7-day inventory with a package and rotation interval first."
        />
      ) : (
        <div className="space-y-5">
          {[
            { label: "24-Hour proxies", items: daily, interval: "24 hours" },
            { label: "7-Day proxies", items: weekly, interval: "7 days" },
          ].map((group) => (
            <section key={group.label}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-semibold">{group.label}</h2>
                  <p className="mt-0.5 text-[9.5px] text-muted-foreground">Reminder interval: every {group.interval}. Manual confirmation required.</p>
                </div>
                <Badge tone="neutral">{group.items.length} inventory</Badge>
              </div>
              {group.items.length === 0 ? (
                <p className="surface-card rounded-[11px] px-4 py-5 text-[10px] text-muted-foreground">No inventory in this category.</p>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {group.items.map((item) => {
                    const due = item.nextRotationAt ? new Date(item.nextRotationAt) : null;
                    const dueState = due
                      ? due.getTime() <= Date.now()
                        ? "Overdue"
                        : `Due ${remainingParts(due).days}d ${remainingParts(due).hours}h`
                      : "Not scheduled";
                    return (
                      <section key={item.id} className="surface-card overflow-hidden rounded-[13px]">
                        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                          <div>
                            <Link href={`/admin/inventory/${item.id}`} className="text-[11.5px] font-semibold hover:underline">
                              {item.label}
                            </Link>
                            <p className="mt-0.5 text-[9px] text-muted-foreground">
                              Group {item.credentialGroup} · {item.host}:{item.port} · {item.protocol.toUpperCase()}
                            </p>
                          </div>
                          <Badge tone={due && due.getTime() <= Date.now() ? "warning" : "neutral"}>{dueState}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-2.5 text-[9px]">
                          <span className="text-muted-foreground">Active customers</span>
                          <span className="tabular text-right font-semibold">{item.activeCustomers}</span>
                          <span className="text-muted-foreground">Expired / ended</span>
                          <span className="tabular text-right">{item.expiredCustomers}</span>
                          <span className="text-muted-foreground">Last rotation</span>
                          <span className="text-right">{formatDateTime(item.lastRotatedAt)}</span>
                          <span className="text-muted-foreground">Credential version</span>
                          <span className="text-right">v{item.credentialVersion}</span>
                        </div>
                        {(() => { const list = customersFor(item.id); const activeList = list.filter((c) => c.active); const expiredList = list.filter((c) => !c.active); return <div className="border-b border-border px-4 py-2.5"><details><summary className="cursor-pointer text-[9px] font-medium text-muted-foreground">Review affected customers · {activeList.length} active, {expiredList.length} expired</summary><div className="mt-2 grid gap-2 sm:grid-cols-2"><div><p className="text-[8px] uppercase tracking-[0.08em] text-success">Will receive new credentials</p><div className="mt-1 space-y-0.5">{activeList.length ? activeList.map((c) => <p key={`${c.username}-${c.email}`} className="text-[8.5px]">{c.username} · {c.email}</p>) : <p className="text-[8.5px] text-muted-foreground">None</p>}</div></div><div><p className="text-[8px] uppercase tracking-[0.08em] text-warning">Expired · no credentials</p><div className="mt-1 space-y-0.5">{expiredList.length ? expiredList.map((c) => <p key={`${c.username}-${c.email}`} className="text-[8.5px] text-muted-foreground">{c.username} · {c.status}</p>) : <p className="text-[8.5px] text-muted-foreground">None</p>}</div></div></div></details></div>; })()}
                        <div className="p-3">
                          <CredentialsPanel
                            inventoryId={item.id}
                            hasCredentials={item.hasCredentials}
                            activeCustomers={item.activeCustomers}
                            expiredCustomers={item.expiredCustomers}
                            rotationActionLabel={
                              item.productSlug === "proxy-7-days"
                                ? "CONFIRM WEEKLY ROTATION"
                                : "CONFIRM CREDENTIAL ROTATION"
                            }
                          />
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Rotation history</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">Only credential version references are recorded. Passwords never enter the audit log.</p>
        </div>
        {history.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No rotations recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-border bg-surface-subtle/60">
                <tr>
                  {["Inventory", "Rotated", "Version", "Active", "Expired", "Emails", "Admin"].map((label) => (
                    <th key={label} className="px-4 py-2 text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 text-[10px]">{row.inventoryLabel}</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(row.rotatedAt)}</td>
                    <td className="px-4 py-2.5 text-[9px]">v{row.previousVersion} → v{row.newVersion}</td>
                    <td className="px-4 py-2.5 tabular text-[9px]">{row.affectedActive}</td>
                    <td className="px-4 py-2.5 tabular text-[9px]">{row.affectedExpired}</td>
                    <td className="px-4 py-2.5 text-[9px]">{row.emailsQueued ?? 0} queued</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{row.adminUsername ?? "Admin"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-2.5 text-[9px] leading-4 text-muted-foreground">
        <RefreshCw className="mt-0.5 h-3 w-3 shrink-0" />
        The scheduler creates in-app reminders at the next rotation time. A reminder stays overdue until a rotation is recorded. Email, SMS and voice alerts require a configured external provider.
      </div>
    </div>
  );
}
