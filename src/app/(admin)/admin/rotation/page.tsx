import Link from "next/link";
import { ArrowUpRight, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CredentialsPanel } from "@/components/admin/credentials-panel";
import { BatchCredentialsPanel } from "@/components/admin/batch-credentials-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminRotationOverview } from "@/server/data/admin";
import { formatDateTime, remainingParts } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Customer = { inventoryId:string; allocationId:string; username:string; email:string; status:string; expiresAt:Date; active:boolean; orderNumber:string };
type Item = Awaited<ReturnType<typeof getAdminRotationOverview>>["inventory"][number];

function CustomerRows({ rows, active }: { rows: Customer[]; active: boolean }) {
  if (!rows.length) return <p className="py-3 text-[9px] text-muted-foreground">No {active ? "active" : "expired"} customers in this batch.</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left"><thead><tr className="border-b border-border">{["Customer","Email","Order","Expires","Status"].map((h)=><th key={h} className="px-2 py-2 text-[7.5px] uppercase tracking-[0.08em] text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((r)=><tr key={r.allocationId}><td className="px-2 py-2 text-[8.5px] font-medium">{r.username}</td><td className="px-2 py-2 text-[8px] text-muted-foreground">{r.email}</td><td className="px-2 py-2 font-mono text-[7.5px] text-muted-foreground">{r.orderNumber}</td><td className="px-2 py-2 text-[8px] text-muted-foreground">{formatDateTime(r.expiresAt)}</td><td className="px-2 py-2"><Badge tone={active?"success":"neutral"}>{active?"active":r.status}</Badge></td></tr>)}</tbody></table></div>;
}

export default async function AdminRotationPage() {
  await requireAdminPage();
  const { inventory, history, customers } = await getAdminRotationOverview();
  const now = Date.now();
  const batches = Array.from(new Map(inventory.map((item) => [item.credentialGroup, inventory.filter((i) => i.credentialGroup === item.credentialGroup)])).entries()).map(([group, items]) => {
    const ids = new Set(items.map((item) => item.id));
    const list = customers.filter((customer) => ids.has(customer.inventoryId));
    const active = list.filter((customer) => customer.active);
    const expired = list.filter((customer) => !customer.active);
    const healthy = items.filter((item) => item.healthStatus === "healthy").length;
    const offline = items.filter((item) => item.healthStatus === "offline" || item.healthStatus === "auth_failure").length;
    const degraded = items.filter((item) => item.healthStatus === "degraded").length;
    const due = items.some((item) => item.nextRotationAt && new Date(item.nextRotationAt).getTime() <= now);
    const lastRotation = items.map((item) => item.lastRotatedAt).filter(Boolean).sort((a,b)=>new Date(b!).getTime()-new Date(a!).getTime())[0] ?? null;
    const lastHealth = items.map((item) => item.lastHealthCheckAt).filter(Boolean).sort((a,b)=>new Date(b!).getTime()-new Date(a!).getTime())[0] ?? null;
    const overall = offline > 0 ? "degraded" : healthy === items.length ? "healthy" : "unknown";
    return { group, items, active, expired, healthy, offline, degraded, due, lastRotation, lastHealth, overall };
  });
  const primary = batches.filter((batch) => batch.group === "A" || batch.items.length > 1);
  const otherGroups = batches.filter((batch) => batch.group !== "A" && batch.items.length === 1);
  const otherItems = otherGroups.flatMap((batch) => batch.items);
  const otherActive = otherGroups.flatMap((batch) => batch.active);
  const otherExpired = otherGroups.flatMap((batch) => batch.expired);
  const otherBatch = otherItems.length ? [{
    group: "Other proxy groups",
    items: otherItems,
    active: otherActive,
    expired: otherExpired,
    healthy: otherItems.filter((item) => item.healthStatus === "healthy").length,
    offline: otherItems.filter((item) => item.healthStatus === "offline" || item.healthStatus === "auth_failure").length,
    degraded: otherItems.filter((item) => item.healthStatus === "degraded").length,
    due: otherItems.some((item) => item.nextRotationAt && new Date(item.nextRotationAt).getTime() <= now),
    lastRotation: otherItems.map((item) => item.lastRotatedAt).filter(Boolean).sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null,
    lastHealth: otherItems.map((item) => item.lastHealthCheckAt).filter(Boolean).sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null,
    overall: otherItems.some((item) => item.healthStatus === "offline" || item.healthStatus === "auth_failure") ? "degraded" : otherItems.every((item) => item.healthStatus === "healthy") ? "healthy" : "unknown",
  }] : [];
  const displayBatches = [...primary, ...otherBatch];
  const totalActive = batches.reduce((n,b)=>n+b.active.length,0); const totalExpired = batches.reduce((n,b)=>n+b.expired.length,0);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Admin · Proxy operations" title="Proxy credential batches" description="Manage credentials by batch. Customer identities are hidden by default; open a batch to review impact or rotate a specific upstream login." actions={<Link href="/admin/proxy-tracker" className="inline-flex h-8 items-center rounded-full border border-border px-3 text-[10px] font-medium">7-day tracker <ArrowUpRight className="ml-1 h-3 w-3" /></Link>} />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{[["Batches",displayBatches.length],["Rotation due",batches.filter(b=>b.due).length],["Active customers",totalActive],["Expired / ended",totalExpired]].map(([label,value])=><div key={String(label)} className="surface-card rounded-[11px] p-3"><p className="text-[9px] text-muted-foreground">{label}</p><p className="tabular mt-1.5 text-[20px] font-semibold leading-none">{value}</p></div>)}</div>
      {displayBatches.length===0?<EmptyState icon={KeyRound} title="No batches found" description="Add proxy inventory with a credential group first."/>:<div className="space-y-3">{displayBatches.map((batch)=><section key={batch.group} className="surface-card overflow-hidden rounded-[13px]"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3.5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-[13px] font-semibold">{batch.group === "A" ? "Batch A" : batch.group === "Other proxy groups" ? "Other proxy groups" : `Batch ${batch.group}`}</h2><Badge tone={batch.overall==="healthy"?"success":batch.offline?"danger":"warning"}>{batch.overall}</Badge>{batch.due?<Badge tone="danger">Rotation due</Badge>:null}</div><p className="mt-1 text-[9px] text-muted-foreground">{batch.items.length} IP{batch.items.length===1?"":"s"} · {batch.healthy} healthy · {batch.degraded} degraded · {batch.offline} offline/auth failure</p></div><div className="grid grid-cols-2 gap-x-5 gap-y-1 text-right text-[8.5px]"><span className="text-muted-foreground">Active customers</span><span className="tabular font-semibold">{batch.active.length}</span><span className="text-muted-foreground">Expired customers</span><span className="tabular">{batch.expired.length}</span><span className="text-muted-foreground">Last health check</span><span>{batch.lastHealth?formatDateTime(batch.lastHealth):"Never"}</span><span className="text-muted-foreground">Last rotation</span><span>{batch.lastRotation?formatDateTime(batch.lastRotation):"Never"}</span></div></div><div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-2.5 sm:grid-cols-5">{[["Total IPs",batch.items.length],["Healthy",batch.healthy],["Degraded",batch.degraded],["Offline/auth",batch.offline],["Rotation due",batch.items.filter(i=>i.nextRotationAt&&new Date(i.nextRotationAt).getTime()<=now).length]].map(([l,v])=><div key={String(l)}><p className="text-[8px] text-muted-foreground">{l}</p><p className="tabular mt-0.5 text-[12px] font-semibold">{v}</p></div>)}</div>{batch.group !== "Other proxy groups" ? <BatchCredentialsPanel group={batch.group} active={batch.active.length} expired={batch.expired.length} inventoryCount={batch.items.length} /> : null}<div className="divide-y divide-border"><details className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[10px] font-medium [&::-webkit-details-marker]:hidden"><span>View customers <span className="font-normal text-muted-foreground">({batch.active.length} active, {batch.expired.length} expired)</span></span><span className="text-[8.5px] text-muted-foreground">Hidden by default</span></summary><div className="space-y-2 px-4 pb-4"><CustomerRows rows={batch.active} active /><div className="rounded-[8px] border border-warning/20 bg-warning-soft/40 p-2"><p className="text-[8.5px] font-medium text-warning">Expired customers · no credentials or email</p><CustomerRows rows={batch.expired} active={false} /></div></div></details><details className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-[10px] font-medium [&::-webkit-details-marker]:hidden"><span>View IPs &amp; rotate credentials <span className="font-normal text-muted-foreground">({batch.items.length} IPs)</span></span><span className="text-[8.5px] text-muted-foreground">Shared upstream</span></summary><div className="space-y-3 px-4 pb-4">{batch.items.map((item)=><div key={item.id} className="rounded-[10px] border border-border"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2"><div><p className="text-[10px] font-medium">{item.host}:{item.port} <span className="font-normal text-muted-foreground">· {item.region ?? "No location"}</span></p><p className="text-[8px] text-muted-foreground">{item.status} · {item.healthStatus} · {item.activeCustomers} active · {item.expiredCustomers} expired</p></div><Badge tone={item.healthStatus==="healthy"?"success":item.healthStatus==="offline"||item.healthStatus==="auth_failure"?"danger":"warning"}>{item.healthStatus}</Badge></div><div className="p-3"><CredentialsPanel inventoryId={item.id} hasCredentials={item.hasCredentials} activeCustomers={item.activeCustomers} expiredCustomers={item.expiredCustomers} rotationActionLabel="I'VE UPDATED THE PROXY · SAVE & NOTIFY ACTIVE CUSTOMERS" /></div></div>)}</div></details></div></section>)}</div>}
      <details className="surface-card overflow-hidden rounded-[13px]">
        <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-semibold [&::-webkit-details-marker]:hidden">Rotation history <span className="ml-1 text-[9px] font-normal text-muted-foreground">({history.length})</span></summary>
        <div className="border-t border-border">
          <p className="px-4 pt-2 text-[9px] text-muted-foreground">No credential values are stored in history.</p>
          {history.length === 0 ? <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No rotations recorded yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border bg-surface-subtle/60"><tr>{["Inventory", "Rotated", "Version", "Active", "Expired", "Notifications", "Admin"].map((label) => <th key={label} className="px-4 py-2 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{history.map((row) => <tr key={row.id}><td className="px-4 py-2.5 text-[9.5px]">{row.inventoryLabel}</td><td className="px-4 py-2.5 text-[8.5px] text-muted-foreground">{formatDateTime(row.rotatedAt)}</td><td className="px-4 py-2.5 text-[9px]">v{row.previousVersion} to v{row.newVersion}</td><td className="px-4 py-2.5 tabular text-[9px]">{row.affectedActive}</td><td className="px-4 py-2.5 tabular text-[9px]">{row.affectedExpired}</td><td className="px-4 py-2.5"><Badge tone={row.notificationStatus === "completed" ? "success" : row.notificationStatus === "queued" ? "warning" : "neutral"}>{row.notificationStatus}</Badge><span className="ml-1 text-[8px] text-muted-foreground">{row.emailsQueued} queued</span></td><td className="px-4 py-2.5 text-[9px] text-muted-foreground">{row.adminUsername ?? "Admin"}</td></tr>)}</tbody></table></div>}
        </div>
      </details>
    </div>
  );
}
