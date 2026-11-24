import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock3, KeyRound, RefreshCw, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CredentialsPanel } from "@/components/admin/credentials-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminRotationOverview } from "@/server/data/admin";
import { formatDateTime, remainingParts } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Customer = { inventoryId: string; allocationId: string; username: string; email: string; status: string; expiresAt: Date; active: boolean; orderNumber: string };

function CustomerReview({ title, customers, active }: { title: string; customers: Customer[]; active: boolean }) {
  return (
    <section className={`rounded-[9px] border p-3 ${active ? "border-success/20 bg-success/[0.025]" : "border-border bg-surface-subtle/40"}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[10px] font-semibold">{title}</h3>
          <p className="mt-0.5 text-[8.5px] text-muted-foreground">{active ? "These customers receive the new credentials by email after confirmation." : "These customers will not receive credentials and remain expired or ended."}</p>
        </div>
        <span className="tabular rounded-full border border-border bg-surface px-2 py-0.5 text-[8px]">{customers.length}</span>
      </div>
      {customers.length === 0 ? <p className="mt-2 text-[9px] text-muted-foreground">No customers in this group.</p> : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead><tr className="border-b border-border">{["Customer", "Email", "Order", "Expires", "Status"].map((header) => <th key={header} className="px-2 py-1.5 text-[7.5px] uppercase tracking-[0.08em] text-muted-foreground">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-border/70">
              {customers.map((customer) => <tr key={customer.allocationId}><td className="px-2 py-1.5 text-[8.5px] font-medium">{customer.username}</td><td className="px-2 py-1.5 text-[8px] text-muted-foreground">{customer.email}</td><td className="px-2 py-1.5 font-mono text-[7.5px] text-muted-foreground">{customer.orderNumber}</td><td className="px-2 py-1.5 text-[8px] text-muted-foreground">{formatDateTime(customer.expiresAt)}</td><td className="px-2 py-1.5"><Badge tone={active ? "success" : "neutral"}>{active ? "active" : customer.status}</Badge></td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function AdminRotationPage() {
  await requireAdminPage();
  const { inventory, history, customers } = await getAdminRotationOverview();
  const groups = [
    { slug: "proxy-24-hours", label: "24-Hour proxies", interval: "24 hours" },
    { slug: "proxy-7-days", label: "7-Day proxies", interval: "7 days" },
    { slug: "proxy-30-days", label: "30-Day proxies", interval: "30 days" },
  ].map((group) => ({ ...group, items: inventory.filter((item) => item.productSlug === group.slug) })).filter((group) => group.items.length > 0);
  const now = Date.now();
  const activeCount = customers.filter((customer) => customer.active).length;
  const expiredCount = customers.filter((customer) => !customer.active).length;
  const dueCount = inventory.filter((item) => item.nextRotationAt && new Date(item.nextRotationAt).getTime() <= now).length;
  const notificationsPending = history.filter((row) => row.notificationStatus === "queued" || row.notificationStatus === "pending").length;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin · Proxy operations"
        title="Proxy rotation & access management"
        description="Manage shared upstream credentials, review active and expired customers, and notify only customers whose paid access is still valid."
        actions={<div className="flex gap-1.5"><Link href="/admin/proxy-tracker" className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[10px] font-medium">7-day tracker <ArrowUpRight className="ml-1 h-3 w-3" /></Link><Link href="/admin/notifications" className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[10px] font-medium"><Clock3 className="h-3 w-3" /> Reminders</Link></div>}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {[["Rotation due", dueCount], ["Active customers", activeCount], ["Expired / ended", expiredCount], ["Notifications pending", notificationsPending], ["Rotations recorded", history.length]].map(([label, value]) => <div key={String(label)} className="surface-card rounded-[11px] p-3"><p className="text-[9px] text-muted-foreground">{label}</p><p className="tabular mt-1.5 text-[20px] font-semibold leading-none">{value}</p></div>)}
      </div>

      <section className="surface-card rounded-[13px] p-4">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><h2 className="text-[12px] font-semibold">The safe rotation sequence</h2></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            ["01", "Review the impact", "Check the exact active customer count and the expired list. Expired customers are excluded automatically."],
            ["02", "Change upstream first", "Update the username or password at the proxy provider. BUYBIZ cannot make that upstream change for you."],
            ["03", "Confirm and notify", "Save the new credentials here. Only revalidated active customers are emailed. Expiry dates never change."],
          ].map(([number, title, body]) => <div key={number} className="rounded-[9px] border border-border bg-surface-subtle/50 p-3"><p className="font-mono text-[8px] text-muted-foreground">{number}</p><p className="mt-1 text-[10px] font-semibold">{title}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{body}</p></div>)}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9px] leading-4 text-warning"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Rotating a shared login affects every active customer on that inventory record. Expired customers are terminated at the BUYBIZ entitlement level and never receive the new credentials. The old upstream IP may still serve other active customers.</p></div>
      </section>

      {inventory.length === 0 ? <EmptyState icon={KeyRound} title="No rotatable inventory" description="Add proxy inventory with a 24-hour, 7-day or 30-day product and a rotation interval first." /> : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.slug}>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-[14px] font-semibold tracking-[-0.02em]">{group.label}</h2><p className="mt-0.5 text-[9.5px] text-muted-foreground">Rotation reminder schedule: every {group.interval}. Reminders do not rotate credentials automatically.</p></div><Badge tone="neutral">{group.items.length} inventory</Badge></div>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const due = item.nextRotationAt ? new Date(item.nextRotationAt) : null;
                  const isDue = Boolean(due && due.getTime() <= now);
                  const list = customers.filter((customer) => customer.inventoryId === item.id);
                  const activeList = list.filter((customer) => customer.active);
                  const expiredList = list.filter((customer) => !customer.active);
                  const dueLabel = due ? (isDue ? "Rotation due" : `Due in ${remainingParts(due).days}d ${remainingParts(due).hours}h`) : "No schedule";
                  return (
                    <section key={item.id} className="surface-card overflow-hidden rounded-[13px]">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5">
                        <div><div className="flex flex-wrap items-center gap-2"><Link href={`/admin/inventory/${item.id}`} className="text-[12.5px] font-semibold hover:underline">{item.label}</Link><Badge tone={item.status === "available" || item.status === "full" ? "success" : "warning"}>{item.status}</Badge>{isDue ? <Badge tone="danger">Rotation due</Badge> : null}</div><p className="mt-1 text-[9px] text-muted-foreground">{item.host}:{item.port} · {item.region ?? "No location"} · {item.protocol.toUpperCase()} · group {item.credentialGroup} · credential v{item.credentialVersion}</p></div>
                        <div className="text-right"><p className="text-[8.5px] text-muted-foreground">Next rotation</p><p className="mt-0.5 text-[10px] font-semibold">{dueLabel}</p>{due ? <p className="mt-0.5 text-[8px] text-muted-foreground">{formatDateTime(due)}</p> : null}</div>
                      </div>
                      <div className="grid grid-cols-2 divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        {[["Active allocations", activeList.length], ["Expired / ended", expiredList.length], ["Last rotation", item.lastRotatedAt ? formatDateTime(item.lastRotatedAt) : "Never"], ["Upstream expiry", item.upstreamExpiresAt ? formatDateTime(item.upstreamExpiresAt) : "Unknown"]].map(([label, value]) => <div key={String(label)} className="px-4 py-2.5"><p className="text-[8px] text-muted-foreground">{label}</p><p className="mt-0.5 text-[9.5px] font-medium">{value}</p></div>)}
                      </div>
                      <div className="space-y-2 p-3.5">
                        <CustomerReview title="Active customers · will receive updated credentials" customers={activeList} active />
                        <CustomerReview title="Expired customers · no credentials, no email" customers={expiredList} active={false} />
                      </div>
                      <div className="border-t border-border p-3.5"><CredentialsPanel inventoryId={item.id} hasCredentials={item.hasCredentials} activeCustomers={activeList.length} expiredCustomers={expiredList.length} rotationActionLabel={item.productSlug === "proxy-7-days" ? "I'VE UPDATED THE PROXY · SAVE & NOTIFY ACTIVE CUSTOMERS" : "I'VE UPDATED THE PROXY · SAVE & NOTIFY ACTIVE CUSTOMERS"} /></div>
                    </section>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Rotation and notification history</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Credential values are never stored here. Only version references, affected counts and email queue state are recorded.</p></div>
        {history.length === 0 ? <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No rotations recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead className="border-b border-border bg-surface-subtle/60"><tr>{["Inventory", "Rotated", "Version", "Active", "Expired", "Notifications", "Admin"].map((label) => <th key={label} className="px-4 py-2 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{history.map((row) => <tr key={row.id}><td className="px-4 py-2.5 text-[9.5px]">{row.inventoryLabel}</td><td className="px-4 py-2.5 text-[8.5px] text-muted-foreground">{formatDateTime(row.rotatedAt)}</td><td className="px-4 py-2.5 text-[9px]">v{row.previousVersion} → v{row.newVersion}</td><td className="px-4 py-2.5 tabular text-[9px]">{row.affectedActive}</td><td className="px-4 py-2.5 tabular text-[9px]">{row.affectedExpired}</td><td className="px-4 py-2.5"><Badge tone={row.notificationStatus === "completed" ? "success" : row.notificationStatus === "queued" ? "warning" : "neutral"}>{row.notificationStatus}</Badge><span className="ml-1 text-[8px] text-muted-foreground">{row.emailsQueued} queued</span></td><td className="px-4 py-2.5 text-[9px] text-muted-foreground">{row.adminUsername ?? "Admin"}</td></tr>)}</tbody></table></div>}
      </section>

      <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-2.5 text-[9px] leading-4 text-muted-foreground"><RefreshCw className="mt-0.5 h-3 w-3 shrink-0" /><span>Scheduled reminders run server-side and use the admin notification email in Settings. Reminders never change credentials. A rotation is complete only after the administrator updates the upstream provider, saves the new credentials here and the email queue confirms delivery.</span></div>
    </div>
  );
}
