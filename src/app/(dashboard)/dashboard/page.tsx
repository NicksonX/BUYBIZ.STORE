import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  LifeBuoy,
  Network,
  Plus,
  ReceiptText,
  PlayCircle,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import {
  getActiveAllocations,
  getActivitySeries,
  getDashboardCounts,
  getRecentLedger,
  getWalletSummary,
} from "@/server/data/customer";
import { getPlanAvailability } from "@/server/data/products";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { TransactionRow } from "@/components/dashboard/transaction-row";
import { PlanStrip } from "@/components/dashboard/plan-strip";
import { TutorialVideo } from "@/components/tutorial/tutorial-video";
import { Countdown } from "@/components/dashboard/countdown";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  cn,
  firstName,
  formatDateTime,
  formatNaira,
  lagosGreeting,
  longDateLagos,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [wallet, counts, recent, activity, active, plans] = await Promise.all([
    getWalletSummary(user.id),
    getDashboardCounts(user.id),
    getRecentLedger(user.id, 5),
    getActivitySeries(user.id),
    getActiveAllocations(user.id, 3),
    getPlanAvailability(),
  ]);

  const totalSpend = activity.reduce((sum, point) => sum + point.spendMinor, 0);
  const name = firstName(user.displayName, user.username);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">
            {longDateLagos()}
          </p>
          <h1 className="mt-1.5 text-[25px] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-[30px]">
            {lagosGreeting()}, {name}.
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Here's what's going on with your account.
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/dashboard/wallet"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "h-9 rounded-full px-4",
            )}
          >
            Add funds
          </Link>
          <Link
            href="/dashboard/marketplace"
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "h-9 rounded-full px-4",
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Quick purchase
          </Link>
        </div>
      </div>

      <section className="space-y-2.5 lg:hidden">
        <div className="relative overflow-hidden rounded-[18px] border border-[#22252a] bg-[#0A0B0D] p-5 text-white shadow-[0_30px_60px_-45px_rgba(0,0,0,0.8)]">
          <div className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-white/[0.08] blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[11px] text-white/45">Wallet balance</p>
              <p className="tabular mt-2 text-[30px] font-semibold leading-none tracking-[-0.05em]">
                {formatNaira(wallet.balanceMinor, { exact: true })}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/10 bg-white/[0.06]">
              <Wallet className="h-4 w-4 text-white/70" />
            </span>
          </div>
          <div className="relative mt-5 flex gap-2">
            <Link
              href="/dashboard/wallet"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[11.5px] font-semibold text-[#0A0B0D]"
            >
              <Plus className="h-3.5 w-3.5" /> Add funds
            </Link>
            <Link
              href="/dashboard/marketplace"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 text-[11.5px] font-medium text-white/80"
            >
              Buy a proxy
            </Link>
          </div>
          <p className="relative mt-3 text-[9.5px] text-white/30">
            Wallet credit can only be spent on BUYBIZ.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { href: "/dashboard/marketplace", label: "Buy", icon: ShoppingBag },
            { href: "/dashboard/proxies", label: "Proxies", icon: Network },
            { href: "/dashboard/orders", label: "Orders", icon: ReceiptText },
            { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="surface-card flex flex-col items-center gap-1.5 rounded-[12px] px-1 py-3 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <item.icon className="h-4 w-4 text-foreground" strokeWidth={1.7} />
              {item.label}
            </Link>
          ))}
        </div>

        <div className="surface-card grid grid-cols-3 divide-x divide-border rounded-[12px]">
          {[
            { label: "Orders", value: counts.totalOrders },
            { label: "Active", value: counts.activeProxies },
            { label: "Tickets", value: counts.openTickets },
          ].map((item) => (
            <div key={item.label} className="px-3 py-3">
              <p className="tabular text-[17px] font-semibold leading-none">
                {item.value}
              </p>
              <p className="mt-1.5 text-[9.5px] text-muted-foreground">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="hidden grid-cols-4 gap-2.5 lg:grid">
        <StatCard
          label="Wallet balance"
          value={formatNaira(wallet.balanceMinor, { exact: true })}
          icon={Wallet}
          hint="Available to spend"
          action={
            <Link
              href="/dashboard/wallet"
              aria-label="Open wallet"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        />
        <StatCard
          label="Total orders"
          value={counts.totalOrders}
          icon={ShoppingBag}
          hint="Orders so far"
        />
        <StatCard
          label="Active services"
          value={counts.activeProxies}
          icon={Network}
          hint="Proxies you can use"
        />
        <StatCard
          label="Support tickets"
          value={counts.openTickets}
          icon={LifeBuoy}
          hint="Waiting on support"
        />
      </div>

      <section className="surface-card flex flex-col gap-3 rounded-[14px] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle">
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold">How to use the platform</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
              A 2-minute walkthrough of your wallet, buying and managing proxies.
            </p>
          </div>
        </div>
        <TutorialVideo variant="compact" />
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.65fr_1fr]">
        <ActivityChart data={activity} totalSpendMinor={totalSpend} />

        <section className="surface-card flex flex-col rounded-[16px] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-semibold tracking-[-0.02em]">
                Recent transactions
              </h2>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                Deposits, purchases and refunds
              </p>
            </div>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-2 flex-1 divide-y divide-border">
            {recent.length > 0 ? (
              recent.map((entry) => (
                <TransactionRow key={entry.id} entry={entry} compact />
              ))
            ) : (
              <div className="pt-3">
                <EmptyState
                  compact
                  icon={ReceiptText}
                  title="No transactions yet"
                  description="Your wallet history will appear here after your first deposit."
                  action={
                    <Link
                      href="/dashboard/wallet"
                      className="text-[11px] font-medium underline underline-offset-2"
                    >
                      Add funds
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.025em]">
              Active proxies
            </h2>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              Your access windows, with the time you have left.
            </p>
          </div>
          <Link
            href="/dashboard/proxies"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {active.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((allocation) => {
              const activated = new Date(allocation.activatedAt).getTime();
              const expires = new Date(allocation.expiresAt).getTime();
              const now = Date.now();
              const remainingPct = Math.max(
                0,
                Math.min(100, ((expires - now) / (expires - activated)) * 100),
              );
              return (
                <Link
                  key={allocation.id}
                  href={`/dashboard/proxies/${allocation.id}`}
                  className="group surface-card relative overflow-hidden rounded-[14px] p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
                        <Network className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="text-[11.5px] font-semibold">
                          {allocation.productName}
                        </p>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          {allocation.region ?? "Region not set"} ·{" "}
                          {allocation.protocol.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Badge tone="success" className="text-[9px]">
                      <span className="h-1 w-1 rounded-full bg-current" /> Active
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[9.5px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> Expires{" "}
                        {formatDateTime(allocation.expiresAt)}
                      </span>
                      <Countdown
                        expiresAt={allocation.expiresAt}
                        className="font-medium text-foreground"
                      />
                    </div>
                    <Progress value={remainingPct} className="mt-2 h-1" />
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                    <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Users className="h-2.5 w-2.5" /> Shared access
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Network}
            title="No active proxies"
            description="When you buy a proxy, its connection details and expiry will appear here."
            action={
              <Link
                href="/dashboard/marketplace"
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "rounded-full px-4",
                )}
              >
                Browse plans
              </Link>
            }
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.025em]">
              Available proxy plans
            </h2>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground">
              Prices come straight from the marketplace.
            </p>
          </div>
          <Link
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          >
            Marketplace <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <PlanStrip plans={plans} />
      </section>
    </div>
  );
}
