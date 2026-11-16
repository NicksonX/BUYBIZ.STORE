import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  CircleDollarSign,
  CreditCard,
  LifeBuoy,
  Network,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AdminSalesChart } from "@/components/admin/sales-chart";
import { requireAdminPage } from "@/server/auth/guards";
import {
  getAdminOverview,
  getAdminRecentDeposits,
  getAdminRecentOrders,
  getAdminSalesRange,
} from "@/server/data/admin";
import { depositStatusMeta, orderStatusMeta } from "@/lib/status";
import { cn, formatDateTime, formatNaira, percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function monthSeries(rows: { month: string; totalMinor: number }[]) {
  const map = new Map(rows.map((row) => [row.month, row.totalMinor]));
  const result: { month: string; totalMinor: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    result.push({ month: key, totalMinor: map.get(key) ?? 0 });
  }
  return result;
}

function rangeFor(value: string | string[] | undefined, from?: string, to?: string) {
  const key = Array.isArray(value) ? value[0] : value;
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  if (key === "today") start.setHours(0, 0, 0, 0);
  else if (key === "yesterday") { start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0); }
  else if (key === "7") start.setDate(start.getDate() - 7);
  else if (key === "month") start.setDate(1), start.setHours(0, 0, 0, 0);
  else if (key === "custom" && from && to) {
    const customStart = new Date(`${from}T00:00:00+01:00`);
    const customEnd = new Date(`${to}T23:59:59+01:00`);
    if (!Number.isNaN(customStart.getTime()) && !Number.isNaN(customEnd.getTime())) {
      return { start: customStart, end: customEnd, key: "custom" as const };
    }
  } else start.setDate(start.getDate() - 30);
  return { start, end, key: key === "today" || key === "yesterday" || key === "7" || key === "month" ? key : "30" as const };
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const range = rangeFor(params.range, Array.isArray(params.from) ? params.from[0] : params.from, Array.isArray(params.to) ? params.to[0] : params.to);
  const [overview, recentOrders, recentDeposits, period] = await Promise.all([
    getAdminOverview(),
    getAdminRecentOrders(6),
    getAdminRecentDeposits(5),
    getAdminSalesRange(range.start, range.end),
  ]);

  const grossProfit =
    overview.netSales - overview.directProxyCost - overview.gatewayFees;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Operations overview"
        description="Live sales, wallet liability, inventory and support activity across BUYBIZ."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/analytics"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10.5px] font-medium hover:bg-accent"
            >
              Reports <ArrowUpRight className="h-3 w-3" />
            </Link>
            <Link
              href="/admin/inventory/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[10.5px] font-semibold text-background"
            >
              Add proxy
            </Link>
          </div>
        }
      />

      {(overview.frozenAccounts > 0 || overview.inactivityAtRisk > 0 || overview.rotationDue > 0) ? (
        <div className="flex flex-wrap gap-2">
          {overview.rotationDue > 0 ? (
            <Link href="/admin/rotation" className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning-soft px-3 py-1.5 text-[9.5px] font-medium text-warning">
              Rotation due: {overview.rotationDue}
            </Link>
          ) : null}
          {overview.frozenAccounts > 0 ? (
            <Link href="/admin/inactivity" className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning-soft px-3 py-1.5 text-[9.5px] font-medium text-warning">
              Frozen accounts: {overview.frozenAccounts}
            </Link>
          ) : null}
          {overview.inactivityAtRisk > 0 ? (
            <Link href="/admin/inactivity" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[9.5px] font-medium text-muted-foreground">
              Inactivity due: {overview.inactivityAtRisk}
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className="surface-card rounded-[13px] p-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sales period</p><p className="mt-1 text-[10px] text-muted-foreground">Only fulfilled proxy orders with an assigned inventory record are sales.</p></div>
          <div className="flex flex-wrap gap-1.5 text-[9.5px]">
            {[['today','Today'],['yesterday','Yesterday'],['7','Last 7 days'],['30','Last 30 days'],['month','This month']].map(([key,label]) => <a key={key} href={`/admin?range=${key}`} className={cn("rounded-full border px-2.5 py-1.5", range.key === key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground")}>{label}</a>)}
            <form method="get" action="/admin" className="flex items-center gap-1"><input type="hidden" name="range" value="custom" /><input name="from" type="date" aria-label="From date" className="h-7 rounded border border-border bg-surface px-1 text-[9px]" /><input name="to" type="date" aria-label="To date" className="h-7 rounded border border-border bg-surface px-1 text-[9px]" /><button className="rounded-full border border-border px-2 py-1 text-[9px]">Custom</button></form>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {[['Total sales',period.grossSales],['Refunds',period.refunds],['Net sales',period.netSales],['Wallet deposits',period.deposits],['Successful orders',period.successfulOrders],['Failed orders',period.failedOrders],['Pending orders',period.pendingOrders]].map(([label,value]) => <div key={String(label)} className="rounded-[9px] border border-border bg-surface-subtle p-2.5"><p className="text-[8.5px] text-muted-foreground">{label}</p><p className="tabular mt-1 text-[14px] font-semibold">{typeof value === "number" && String(label).includes("orders") ? value : formatNaira(Number(value), { exact: true })}</p></div>)}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard
          label="Total sales"
          value={formatNaira(overview.totalSales, { exact: true })}
          icon={TrendingUp}
          hint={`${overview.successfulProxyOrders} fulfilled proxy orders`}
        />
        <StatCard
          label="Total refunds"
          value={formatNaira(overview.totalRefunds, { exact: true })}
          icon={CircleDollarSign}
          hint="Confirmed refunds against fulfilled sales"
        />
        <StatCard
          label="Net sales"
          value={formatNaira(overview.netSales, { exact: true })}
          icon={BadgeDollarSign}
          hint="Total sales minus confirmed refunds"
        />
        <StatCard
          label="Verified deposits"
          value={formatNaira(overview.totalDeposits, { exact: true })}
          icon={CreditCard}
          hint="Liability until spent"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          { label: "Successful proxy orders", value: String(overview.successfulProxyOrders), icon: TrendingUp, hint: "Fulfilled with assigned inventory" },
          { label: "Failed orders", value: String(overview.failedOrders), icon: CircleDollarSign, hint: "Failed, cancelled or unfulfilled" },
          { label: "Pending orders", value: String(overview.pendingOrders), icon: CreditCard, hint: "Awaiting payment or fulfillment" },
          { label: "Active proxies", value: String(overview.activeAllocations), icon: Network, hint: `${overview.availableSeats} seats available` },
        ].map((item) => (
          <div key={item.label} className="surface-card rounded-[12px] p-3.5">
            <div className="flex items-center justify-between"><p className="text-[9.5px] text-muted-foreground">{item.label}</p><item.icon className="h-3.5 w-3.5 text-muted-foreground" /></div>
            <p className="tabular mt-2 text-[18px] font-semibold">{item.value}</p>
            <p className="mt-1 text-[8.5px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          {
            label: "Wallet liability",
            value: formatNaira(overview.walletLiability, { exact: true }),
            icon: Wallet,
            hint: "Outstanding customer balances",
          },
          {
            label: "Estimated gross profit",
            value: formatNaira(Math.max(0, grossProfit), { exact: true }),
            icon: BadgeDollarSign,
            hint: "Sales minus proxy cost and gateway fees",
          },
          {
            label: "Refunds issued",
            value: formatNaira(overview.totalRefunds, { exact: true }),
            icon: CircleDollarSign,
            hint: "Internal wallet credits only",
          },
          {
            label: "Inventory cost",
            value: formatNaira(overview.inventoryCost, { exact: true }),
            icon: Package,
            hint: "Recorded purchase cost",
          },
        ].map((item) => (
          <div key={item.label} className="surface-card rounded-[12px] p-3.5">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-medium text-muted-foreground">
                {item.label}
              </p>
              <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="tabular mt-2 break-words text-[14.5px] font-semibold leading-tight tracking-[-0.03em] min-[400px]:text-[16px]">
              {item.value}
            </p>
            <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
              {item.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[1.55fr_1fr]">
        <AdminSalesChart data={monthSeries(overview.monthlySales)} />

        <section className="surface-card rounded-[15px] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-semibold">Inventory usage</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Active seats against each proxy's capacity.
              </p>
            </div>
            <Link
              href="/admin/inventory"
              className="text-[9.5px] font-medium text-muted-foreground hover:text-foreground"
            >
              Manage
            </Link>
          </div>
          <div className="mt-4 space-y-3.5">
            {overview.inventoryUtilization.slice(0, 5).map((item) => (
              <div key={item.id}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[10.5px] font-medium">{item.label}</p>
                  <span className="tabular text-[9.5px] text-muted-foreground">
                    {item.activeSeats}/{item.maxSeats}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Progress
                    value={percent(item.activeSeats, item.maxSeats)}
                    className="h-1"
                  />
                  <span className="w-10 text-right text-[8.5px] capitalize text-muted-foreground">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
            {overview.inventoryUtilization.length === 0 ? (
              <p className="py-6 text-center text-[10px] text-muted-foreground">
                No proxy inventory has been added yet.
              </p>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <div>
              <p className="text-[9px] text-muted-foreground">Available seats</p>
              <p className="tabular mt-1 text-[14px] font-semibold">
                {overview.availableSeats}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground">Pending deposits</p>
              <p className="tabular mt-1 text-[14px] font-semibold">
                {overview.pendingDeposits}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[1.45fr_1fr]">
        <section className="surface-card overflow-hidden rounded-[15px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <div>
              <h2 className="text-[13px] font-semibold">Recent orders</h2>
              <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                Newest purchases across all customers.
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground hover:text-foreground"
            >
              All orders <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-subtle/60">
                  {["Customer", "Order", "Amount", "Status", "Date"].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => {
                  const meta = orderStatusMeta(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-surface-subtle/50">
                      <td className="px-4 py-2.5 text-[10.5px]">
                        <Link href={`/admin/users/${order.userId}`} className="font-medium hover:underline">
                          {order.username}
                        </Link>
                        <p className="text-[8.5px] text-muted-foreground">{order.productName}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-mono text-[9px] text-muted-foreground hover:text-foreground"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="tabular px-4 py-2.5 text-[10.5px] font-medium">
                        {formatNaira(order.amountMinor, { exact: true })}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[9px] text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface-card overflow-hidden rounded-[15px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <div>
              <h2 className="text-[13px] font-semibold">Recent deposits</h2>
              <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                Verified payments and pending attempts.
              </p>
            </div>
            <Link
              href="/admin/deposits"
              className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground hover:text-foreground"
            >
              All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentDeposits.map((deposit) => {
              const meta = depositStatusMeta(deposit.status);
              return (
                <div key={deposit.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] font-medium">{deposit.username}</p>
                    <p className="mt-0.5 truncate font-mono text-[8px] text-muted-foreground">
                      {deposit.providerReference}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[10.5px] font-semibold">
                      {formatNaira(deposit.amountMinor, { exact: true })}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-[9px] text-muted-foreground">
            <LifeBuoy className="h-3 w-3" />
            {overview.openTickets} open support tickets need review.
            <Link href="/admin/support" className="ml-auto text-foreground hover:underline">
              Open
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <section className="surface-card rounded-[15px] p-4 sm:p-5">
          <h2 className="text-[13px] font-semibold">Sales by package</h2>
          <p className="mt-1 text-[9.5px] text-muted-foreground">
            Completed orders only. Refunded orders are not counted as sales.
          </p>
          <div className="mt-4 space-y-3">
            {overview.packageMix.map((item) => {
              const max = Math.max(...overview.packageMix.map((row) => row.count), 1);
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium">{item.name}</span>
                    <span className="tabular text-muted-foreground">
                      {item.count} · {formatNaira(item.totalMinor)}
                    </span>
                  </div>
                  <Progress value={percent(item.count, max)} className="mt-1.5 h-1" />
                </div>
              );
            })}
            {overview.packageMix.length === 0 ? (
              <p className="py-4 text-center text-[10px] text-muted-foreground">
                No completed sales yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[15px] border border-border bg-surface-subtle p-4 text-[9px] leading-5 text-muted-foreground sm:p-5">
          <h2 className="text-[11px] font-semibold text-foreground">How these numbers work</h2>
          <ul className="mt-3 space-y-1.5">
            <li>Deposits are money received, not revenue. They remain a liability until spent.</li>
            <li>Sales counts completed proxy orders only.</li>
            <li>Refunds are internal wallet credits and are not new revenue.</li>
            <li>Wallet liability is the ledger sum of all customer balances.</li>
            <li>Gross profit is an estimate: sales minus recorded proxy costs and gateway fees.</li>
            <li>Every admin financial action creates an audit entry.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
