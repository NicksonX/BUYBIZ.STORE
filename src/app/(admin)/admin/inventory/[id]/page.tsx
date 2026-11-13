import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Clock3,
  Network,
  Pause,
  Play,
  ShieldAlert,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { CredentialsPanel } from "@/components/admin/credentials-panel";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminInventoryDetail } from "@/server/data/admin";
import { getPlanAvailability } from "@/server/data/products";
import {
  setInventoryStatusAction,
  updateInventoryAction,
} from "@/server/actions/admin";
import { allocationStatusMeta } from "@/lib/status";
import {
  cn,
  formatDateTime,
  formatNaira,
  percent,
  remainingParts,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusTone = {
  available: "success",
  full: "info",
  paused: "warning",
  expired: "neutral",
  disabled: "danger",
} as const;

export default async function AdminInventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  const [data, plans] = await Promise.all([
    getAdminInventoryDetail(id),
    getPlanAvailability(),
  ]);
  if (!data) notFound();
  const { inventory, allocations } = data;
  const remaining = remainingParts(inventory.upstreamExpiresAt);
  const seatPercent = percent(inventory.activeSeats, inventory.maxSeats);

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/admin/inventory"
        backLabel="Back to inventory"
        eyebrow="Proxy inventory"
        title={inventory.label}
        description={`${inventory.host}:${inventory.port} · ${inventory.protocol.toUpperCase()} · ${inventory.region ?? "No region"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone[inventory.status]} className="capitalize">{inventory.status}</Badge>
            {inventory.status === "paused" ? (
              <AdminActionForm
                action={setInventoryStatusAction}
                hidden={{ inventoryId: inventory.id, status: "available" }}
                submitLabel="Resume"
                pendingLabel="Resuming…"
                variant="outline"
                compact
                className="inline-flex"
                confirmMessage="Resume this proxy for new allocations?"
              />
            ) : inventory.status === "available" || inventory.status === "full" ? (
              <AdminActionForm
                action={setInventoryStatusAction}
                hidden={{ inventoryId: inventory.id, status: "paused" }}
                submitLabel="Pause"
                pendingLabel="Pausing…"
                variant="outline"
                compact
                className="inline-flex"
                confirmMessage="Pause new allocations on this proxy? Existing customers keep access until their expiry."
              />
            ) : null}
            {inventory.status !== "disabled" ? (
              <AdminActionForm
                action={setInventoryStatusAction}
                hidden={{ inventoryId: inventory.id, status: "disabled" }}
                submitLabel="Disable"
                pendingLabel="Disabling…"
                variant="subtle"
                compact
                className="inline-flex"
                confirmMessage="Disable this inventory item for new allocations?"
              />
            ) : null}
            {inventory.activeSeats === 0 ? (
              <AdminActionForm
                action={setInventoryStatusAction}
                hidden={{ inventoryId: inventory.id, status: "archive" }}
                submitLabel="Archive"
                pendingLabel="Archiving…"
                variant="danger"
                compact
                className="inline-flex"
                confirmMessage="Archive this inventory item? Financial history is retained."
              />
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
        <div className="surface-card rounded-[12px] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[9.5px] text-muted-foreground">Seats used</p>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="tabular mt-2 text-[18px] font-semibold">{inventory.activeSeats}/{inventory.maxSeats}</p>
          <Progress value={seatPercent} className="mt-2 h-1" />
        </div>
        <div className="surface-card rounded-[12px] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[9.5px] text-muted-foreground">Free seats</p>
            <Network className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="tabular mt-2 text-[18px] font-semibold">{inventory.freeSeats}</p>
          <p className="mt-1 text-[8.5px] text-muted-foreground">Only sellable while lifetime is sufficient</p>
        </div>
        <div className="surface-card rounded-[12px] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[9.5px] text-muted-foreground">Upstream expiry</p>
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-[11px] font-semibold">{formatDateTime(inventory.upstreamExpiresAt)}</p>
          <p className={cn("mt-1 text-[8.5px]", remaining.expired ? "text-danger" : "text-muted-foreground")}>
            {remaining.expired ? "Expired" : `${remaining.days}d ${remaining.hours}h remaining`}{inventory.expiryIsEstimated ? " · assumed" : " · provider confirmed"}
          </p>
        </div>
        <div className="surface-card rounded-[12px] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[9.5px] text-muted-foreground">Access type</p>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-[13px] font-semibold">
            {inventory.accessType === "single" ? "Single customer" : "Shared"}
          </p>
          <p className="mt-1 text-[8.5px] text-muted-foreground">Enforced by the database</p>
        </div>
        <div className="surface-card rounded-[12px] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[9.5px] text-muted-foreground">Purchase cost</p>
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="tabular mt-2 text-[18px] font-semibold">{formatNaira(inventory.purchaseCostMinor, { exact: true })}</p>
          <p className="mt-1 text-[8.5px] text-muted-foreground">Recorded direct cost</p>
        </div>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[1fr_1fr]">
        <CredentialsPanel inventoryId={inventory.id} hasCredentials={inventory.hasCredentials} />

        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Metadata</h2>
          <p className="mt-1 text-[9.5px] text-muted-foreground">
            Update non-secret inventory details. Credentials are managed separately.
          </p>
          <div className="mt-4">
            <AdminActionForm
              action={updateInventoryAction}
              hidden={{ inventoryId: inventory.id }}
              submitLabel="Save metadata"
              pendingLabel="Saving…"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Label" htmlFor="inv-label">
                  <Input id="inv-label" name="label" defaultValue={inventory.label} required maxLength={80} />
                </AdminField>
                <AdminField label="Region" htmlFor="inv-region">
                  <Input id="inv-region" name="region" defaultValue={inventory.region ?? ""} />
                </AdminField>
                <AdminField label="Proxy package" htmlFor="inv-product" hint="Cannot change while customers are active">
                  <Select id="inv-product" name="productSlug" defaultValue={inventory.productSlug ?? "proxy-24-hours"}>
                    {plans.map((plan) => (
                      <option key={plan.product.id} value={plan.product.slug}>
                        {plan.product.name}
                      </option>
                    ))}
                  </Select>
                </AdminField>
                <AdminField label="Credential group" htmlFor="inv-group">
                  <Input id="inv-group" name="credentialGroup" defaultValue={inventory.credentialGroup} maxLength={24} />
                </AdminField>
                <AdminField label="Purchase cost (NGN)" htmlFor="inv-cost">
                  <Input id="inv-cost" name="purchaseCost" inputMode="decimal" defaultValue={(inventory.purchaseCostMinor / 100).toString()} />
                </AdminField>
                <AdminField label="Maximum seats" htmlFor="inv-max" hint={`${inventory.activeSeats} active. Single access is always 1.`}>
                  <Input id="inv-max" name="maxSeats" type="number" min={1} max={10} defaultValue={inventory.maxSeats} />
                </AdminField>
                <AdminField label="Access type" htmlFor="inv-access">
                  <Select id="inv-access" name="accessType" defaultValue={inventory.accessType}>
                    <option value="shared">Shared access</option>
                    <option value="single">Single customer (personal)</option>
                  </Select>
                </AdminField>
              </div>
              <AdminField label="Provider note (private)" htmlFor="inv-provider">
                <Input id="inv-provider" name="providerNote" defaultValue={inventory.providerNote ?? ""} />
              </AdminField>
              <AdminField label="Admin notes" htmlFor="inv-notes">
                <Textarea id="inv-notes" name="adminNotes" defaultValue={inventory.adminNotes ?? ""} className="min-h-20 text-[11px]" />
              </AdminField>
            </AdminActionForm>
          </div>
        </section>
      </div>

      <section className="surface-card overflow-hidden rounded-[14px]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-[12px] font-semibold">Allocations on this proxy</h2>
            <p className="mt-0.5 text-[9px] text-muted-foreground">
              Customers are never exposed to each other's identity or credentials.
            </p>
          </div>
          <Link href="/admin/allocations" className="text-[9.5px] text-muted-foreground hover:text-foreground">
            All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {allocations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-subtle/60">
                  {["Customer", "Product", "Status", "Activated", "Expires", "Order"].map((label) => (
                    <th key={label} className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocations.map((allocation) => {
                  const meta = allocationStatusMeta(allocation.status);
                  return (
                    <tr key={allocation.id} className="hover:bg-surface-subtle/40">
                      <td className="px-4 py-2.5 text-[10px]">
                        <Link href={`/admin/users/${allocation.userId}`} className="font-medium hover:underline">{allocation.username}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-[10px]">{allocation.productName}</td>
                      <td className="px-4 py-2.5"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(allocation.activatedAt)}</td>
                      <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(allocation.expiresAt)}</td>
                      <td className="px-4 py-2.5 font-mono text-[8.5px] text-muted-foreground">{allocation.orderNumber}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No allocations yet.</p>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-[9px] leading-4 text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
        Pausing or disabling prevents new allocations. Existing customers continue until their own expiry. Changing shared credentials can interrupt every customer on this proxy.
      </div>
    </div>
  );
}
