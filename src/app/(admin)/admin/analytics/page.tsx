import Link from "next/link";
import { BarChart3, CircleDollarSign, Info, ReceiptText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AdminSalesChart } from "@/components/admin/sales-chart";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminAnalytics } from "@/server/data/admin";
import { cn, formatNaira, percent } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const ranges = [
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last 12 months" },
];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const requested = Number(first(params.range) ?? "30");
  const days = ranges.some((range) => range.days === requested) ? requested : 30;
  const analytics = await getAdminAnalytics(days);

  const grossProfit = analytics.netSales - analytics.directProxyCost;
  const netContribution =
    grossProfit - analytics.gatewayFees - analytics.operatingExpenses;
  const maxCategory = Math.max(
    ...analytics.expensesByCategory.map((item) => item.totalMinor),
    1,
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Reports"
        title="Analytics and reconciliation"
        description="Every figure below comes from orders, the wallet ledger, deposits or recorded expenses. Deposits are liabilities, never revenue."
        actions={
          <div className="flex rounded-full border border-border bg-surface p-0.5">
            {ranges.map((range) => (
              <Link
                key={range.days}
                href={`/admin/analytics?range=${range.days}`}
                className={cn(
                  "inline-flex h-7 items-center rounded-full px-3 text-[9.5px] font-medium",
                  days === range.days
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {range.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          { label: "Net sales", value: analytics.netSales, hint: `${analytics.completedOrders} completed orders` },
          { label: "Wallet refunds", value: analytics.refunds, hint: "Not revenue; reverses debits" },
          { label: "Verified deposits", value: analytics.deposits, hint: "Liabilities until spent" },
          { label: "Wallet liability", value: analytics.walletLiability, hint: "All customer balances now" },
        ].map((item) => (
          <div key={item.label} className="surface-card rounded-[12px] p-3.5">
            <p className="text-[9.5px] text-muted-foreground">{item.label}</p>
            <p className="tabular mt-2 text-[18px] font-semibold tracking-[-0.03em]">
              {formatNaira(item.value, { exact: true })}
            </p>
            <p className="mt-1 text-[8.5px] text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-[1.4fr_1fr]">
        <AdminSalesChart
          data={analytics.monthly.map((item) => ({
            month: item.month,
            totalMinor: item.salesMinor,
          }))}
        />

        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Reconciliation</h2>
          <p className="mt-1 text-[9px] text-muted-foreground">
            {days}-day window. Each line has one definition and is not double-counted.
          </p>
          <div className="mt-3 space-y-2 text-[10px]">
            <Line label="Gross purchase volume" value={analytics.grossPurchaseVolume} />
            <Line label="Less wallet refunds" value={-analytics.refunds} />
            <div className="border-t border-border pt-2">
              <Line label="Net sales" value={analytics.netSales} strong />
            </div>
            <Line label="Direct proxy cost" value={-analytics.directProxyCost} />
            <Line label="Estimated gross profit" value={grossProfit} strong />
            <Line label="Payment gateway fees" value={-analytics.gatewayFees} />
            <Line label="Operating expenses" value={-analytics.operatingExpenses} />
            <div className="border-t border-border pt-2">
              <Line label="Estimated net contribution" value={netContribution} strong />
            </div>
          </div>
          <p className="mt-3 text-[8.5px] leading-4 text-muted-foreground">
            Direct proxy cost currently uses the full recorded purchase cost of
            inventory that served at least one allocation in this window. It is an
            estimate, not accounting-grade cost allocation.
          </p>
        </section>
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-3">
        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Sales by package</h2>
          <div className="mt-3 space-y-3">
            {analytics.packageMix.length ? (
              analytics.packageMix.map((item) => {
                const max = Math.max(...analytics.packageMix.map((row) => row.count), 1);
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="font-medium">{item.name}</span>
                      <span className="tabular text-muted-foreground">
                        {item.count} · {formatNaira(item.totalMinor)}
                      </span>
                    </div>
                    <Progress value={percent(item.count, max)} className="mt-1.5 h-1" />
                  </div>
                );
              })
            ) : (
              <p className="py-3 text-[9.5px] text-muted-foreground">No completed sales in this range.</p>
            )}
          </div>
        </section>

        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Expenses by category</h2>
          <div className="mt-3 space-y-3">
            {analytics.expensesByCategory.length ? (
              analytics.expensesByCategory.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-[9.5px]">
                    <span className="capitalize">{item.category.replace("_", " ")}</span>
                    <span className="tabular text-muted-foreground">{formatNaira(item.totalMinor)}</span>
                  </div>
                  <Progress value={percent(item.totalMinor, maxCategory)} className="mt-1.5 h-1" />
                </div>
              ))
            ) : (
              <p className="py-3 text-[9.5px] text-muted-foreground">No expenses in this range.</p>
            )}
          </div>
        </section>

        <section className="rounded-[14px] border border-border bg-surface-subtle p-4">
          <h2 className="flex items-center gap-1.5 text-[11px] font-semibold">
            <Info className="h-3.5 w-3.5" /> Reporting definitions
          </h2>
          <ul className="mt-2.5 space-y-2 text-[8.5px] leading-4 text-muted-foreground">
            <li><strong className="text-foreground">Deposits:</strong> verified Paystack or credited demo payments. Liability, not revenue.</li>
            <li><strong className="text-foreground">Sales:</strong> completed proxy orders only.</li>
            <li><strong className="text-foreground">Refunds:</strong> wallet credits linked to unfulfilled purchases. Not new revenue.</li>
            <li><strong className="text-foreground">Wallet liability:</strong> sum of all current ledger balances.</li>
            <li><strong className="text-foreground">Gross profit:</strong> net sales minus recorded direct proxy cost.</li>
            <li><strong className="text-foreground">Fees:</strong> gateway fees recorded on credited deposits.</li>
            <li><strong className="text-foreground">Expenses:</strong> manual operating costs.</li>
          </ul>
        </section>
      </div>

      <div className="flex items-start gap-2 rounded-[10px] border border-warning/20 bg-warning-soft px-3 py-2.5 text-[9px] leading-4 text-warning">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Refunds are shown as a separate line so a refunded order is never counted
        as both a sale and a loss. Check the raw ledger before making financial
        decisions based on this estimate.
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={strong ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={cn("tabular", strong ? "font-semibold text-foreground" : "text-foreground")}>
        {value < 0 ? "−" : ""}
        {formatNaira(Math.abs(value), { exact: true })}
      </span>
    </div>
  );
}
