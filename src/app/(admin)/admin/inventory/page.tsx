import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Network,
  Package,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminInventory } from "@/server/data/admin";
import {
  cn,
  formatDate,
  formatNaira,
  percent,
  remainingParts,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const statusTone = {
  available: "success",
  full: "info",
  paused: "warning",
  expired: "neutral",
  disabled: "danger",
} as const;

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const status = first(params.status) ?? "all";
  const protocol = first(params.protocol) ?? "all";
  const category = first(params.category) ?? "all";
  const categorySlugs =
    category === "24-hours"
      ? ["proxy-24-hours"]
      : category === "7-days"
        ? ["proxy-7-days"]
        : category === "30-days"
          ? ["proxy-30-days", "proxy-personal-30-days"]
          : undefined;
  const items = await getAdminInventory({
    q,
    status,
    protocol,
    productSlugs: categorySlugs,
  });
  const liveItems = items.filter(
    (item) =>
      (item.status === "available" || item.status === "full") &&
      new Date(item.upstreamExpiresAt).getTime() > Date.now(),
  );
  const counts = {
    available: liveItems.length,
    seats: items.reduce((sum, item) => sum + item.activeSeats, 0),
    free: liveItems.reduce((sum, item) => sum + item.freeSeats, 0),
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Proxy inventory"
        description="Every upstream proxy is added manually. Seat counts are computed from active allocations with a future expiry."
        actions={
          <Link
            href="/admin/inventory/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[10.5px] font-semibold text-background"
          >
            <Plus className="h-3.5 w-3.5" /> Add proxy
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        {[
          ["all", "All inventory"],
          ["24-hours", "24-Hour Proxies"],
          ["7-days", "7-Day Proxies"],
          ["30-days", "30-Day Proxies"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={key === "all" ? "/admin/inventory" : `/admin/inventory?category=${key}`}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3.5 text-[10px] font-medium",
              category === key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/admin/rotation"
          className="inline-flex h-8 items-center rounded-full border border-warning/25 bg-warning-soft px-3.5 text-[10px] font-medium text-warning"
        >
          Rotation centre
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {[
          { label: "Live proxies", value: counts.available, icon: Package },
          { label: "Active seats", value: counts.seats, icon: Users },
          { label: "Free seats", value: counts.free, icon: Network },
        ].map((item) => (
          <div key={item.label} className="surface-card rounded-[11px] p-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground">{item.label}</p>
              <item.icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="tabular mt-1.5 text-[18px] font-semibold leading-none">{item.value}</p>
          </div>
        ))}
      </div>

      <form method="get" className="surface-card mt-3 flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search label, host or region" className="h-9 pl-8 text-[11.5px]" aria-label="Search inventory" />
        </div>
        <Select name="status" defaultValue={status} className="h-9 sm:w-[150px]" aria-label="Filter status">
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="full">Full</option>
          <option value="paused">Paused</option>
          <option value="expired">Expired</option>
          <option value="disabled">Disabled</option>
        </Select>
        <Select name="protocol" defaultValue={protocol} className="h-9 sm:w-[130px]" aria-label="Filter protocol">
          <option value="all">All protocols</option>
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
          <option value="socks4">SOCKS4</option>
          <option value="socks5">SOCKS5</option>
        </Select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Filter</button>
        <Link href="/admin/inventory" className="inline-flex h-9 items-center justify-center rounded-full border border-border px-3 text-[10px] text-muted-foreground hover:bg-accent">Reset</Link>
      </form>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Package}
            title="No proxy inventory matches"
            description="Add one manually or clear the filters. Passwords are encrypted and never returned in this list."
            action={<Link href="/admin/inventory/new" className="inline-flex h-8 items-center rounded-full bg-foreground px-3.5 text-[10.5px] font-semibold text-background">Add proxy</Link>}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2.5 xl:grid-cols-2">
          {items.map((item) => {
            const expiry = remainingParts(item.upstreamExpiresAt);
            const seatPercent = percent(item.activeSeats, item.maxSeats);
            return (
              <Link
                key={item.id}
                href={`/admin/inventory/${item.id}`}
                className="surface-card group rounded-[13px] p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                      <Package className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium">{item.label}</p>
                      <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                        {item.productSlug ?? "Unassigned"} · Group {item.credentialGroup} · {item.protocol.toUpperCase()} · {item.accessType === "single" ? "Single" : "Shared"} · {item.region ?? "No region"}
                      </p>
                    </div>
                  </div>
                  <Badge tone={statusTone[item.status]} className="shrink-0 capitalize">{item.status}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
                  <div>
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>Seats used</span>
                      <span className="tabular">{item.activeSeats}/{item.maxSeats}</span>
                    </div>
                    <Progress value={seatPercent} className="mt-1.5 h-1" />
                  </div>
                  <div className="text-right">
                    <p className="tabular text-[11px] font-semibold">{formatNaira(item.purchaseCostMinor, { exact: true })}</p>
                    <p className="mt-0.5 text-[8.5px] text-muted-foreground">purchase cost</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 text-[9px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {expiry.expired ? "Expired" : `Expires ${formatDate(item.upstreamExpiresAt)}`}
                    {item.expiryIsEstimated ? <span className="rounded bg-surface-subtle px-1 py-0.5 text-[7.5px]">assumed</span> : null}
                  </span>
                  <span className={cn("inline-flex items-center gap-1 font-medium text-foreground")}>
                    Manage <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
