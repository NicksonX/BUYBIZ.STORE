import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Bell,
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
  formatDuration,
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
            Your wallet, active proxies and recent activity.
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

      <section className="space-y-3 lg:hidden">
        <div className="relative overflow-hidden rounded-[20px] border border-[#22252a] bg-[#0A0B0D] p-5 text-white shadow-[0_30px_60px_-45px_rgba(0,0,0,0.8)]">
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">Available balance</p>
              <p className="tabular mt-2 text-[32px] font-semibold leading-none tracking-[-0.055em]">{formatNaira(wallet.balanceMinor, { exact: true })}</p>
              <p className="mt-1.5 text-[9.5px] text-white/45">BUYBIZ credits · 1 credit = ₦1</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]"><Wallet className="h-4 w-4 text-white/70" /></span>
          </div>
          <div className="relative mt-5 grid grid-cols-2 gap-2">
            <Link href="/dashboard/wallet" className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white text-[11.5px] font-semibold text-[#0A0B0D]"><Plus className="h-3.5 w-3.5" /> Deposit</Link>
            <Link href="/dashboard/marketplace" className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 text-[11.5px] font-medium text-white/85">Explore services</Link>
          </div>
        </div>

        <section className="surface-card rounded-[15px] p-4">
          <div className="flex items-end justify-between gap-3">
            <div><h2 className="text-[13px] font-semibold tracking-[-0.02em]">Proxy services</h2><p className="mt-0.5 text-[9.5px] text-muted-foreground">Live plans and availability</p></div>
            <Link href="/dashboard/marketplace" className="inline-flex items-center gap-1 text-[9.5px] font-medium text-muted-foreground">View all <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          <div className="mt-3">
            {plans.some((plan) => plan.available) ? (
              <div className="space-y-2">
                {plans.filter((plan) => plan.available).slice(0, 3).map((plan) => (
                  <Link key={plan.product.id} href={`/dashboard/checkout/${plan.product.slug}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5">
                    <div className="min-w-0"><p className="text-[10.5px] font-semibold">{formatDuration(plan.product.durationSeconds)}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{plan.product.accessType === "single" ? "Personal proxy" : "Shared access"}</p></div>
                    <div className="flex items-center gap-2"><p className="tabular text-[11px] font-semibold">{formatNaira(plan.product.priceMinor)}</p><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" /></div>
                  </Link>
                ))}
              </div>
            ) : <p className="rounded-[9px] border border-dashed border-border px-3 py-4 text-[9.5px] text-muted-foreground">No proxy plans are available right now. Check again shortly.</p>}
          </div>
        </section>

        <section className="surface-card rounded-[15px] p-4">
          <div className="flex items-end justify-between gap-3">
            <div><h2 className="text-[13px] font-semibold tracking-[-0.02em]">Active subscriptions</h2><p className="mt-0.5 text-[9.5px] text-muted-foreground">Your current access windows</p></div>
            <Link href="/dashboard/proxies" className="inline-flex items-center gap-1 text-[9.5px] font-medium text-muted-foreground">Manage <ArrowUpRight className="h-3 w-3" /></Link>
          </div>
          {active.length > 0 ? (
            <div className="mt-3 space-y-2">
              {active.slice(0, 2).map((allocation) => (
                <Link key={allocation.id} href={`/dashboard/proxies/${allocation.id}`} className="flex items-center gap-3 rounded-[10px] border border-border bg-surface-subtle p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-surface"><Network className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{allocation.productName}</p><p className="mt-0.5 text-[8.5px] text-muted-foreground">{allocation.region ?? "Shared"} · Expires {formatDateTime(allocation.expiresAt)}</p></div>
                  <Countdown expiresAt={allocation.expiresAt} className="shrink-0 text-[9px] font-medium text-success" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-[10px] border border-dashed border-border px-3 py-4 text-[9.5px] text-muted-foreground">No active subscriptions yet. Explore a plan to get started.</div>
          )}
        </section>

        <Link href="/dashboard/notifications" className="surface-card flex items-center gap-3 rounded-[15px] p-4">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle"><Bell className="h-4 w-4" />{counts.unreadNotifications > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[8px] font-semibold text-background">{counts.unreadNotifications > 9 ? "9+" : counts.unreadNotifications}</span> : null}</span>
          <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold">Account updates</p><p className="mt-0.5 text-[9px] text-muted-foreground">{counts.unreadNotifications > 0 ? `${counts.unreadNotifications} unread notification${counts.unreadNotifications === 1 ? "" : "s"}` : "No unread notifications"}</p></div>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>

        <section className="surface-card rounded-[15px] p-4">
          <div className="flex items-end justify-between gap-3"><div><h2 className="text-[13px] font-semibold tracking-[-0.02em]">Recent activity</h2><p className="mt-0.5 text-[9.5px] text-muted-foreground">Your latest wallet movements</p></div><Link href="/dashboard/transactions" className="inline-flex items-center gap-1 text-[9.5px] font-medium text-muted-foreground">History <ArrowUpRight className="h-3 w-3" /></Link></div>
          <div className="mt-2 divide-y divide-border">
            {recent.length > 0 ? recent.slice(0, 3).map((entry) => <TransactionRow key={entry.id} entry={entry} compact />) : <p className="py-4 text-[9.5px] text-muted-foreground">Your first deposit will appear here.</p>}
          </div>
        </section>
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

      <section className="surface-card hidden gap-3 rounded-[14px] px-4 py-3.5 lg:flex lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle">
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold">How to use the platform</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
              A 90-second walkthrough of your wallet, proxy access, referrals and Ambassador rewards.
            </p>
          </div>
        </div>
        <TutorialVideo variant="compact" />
      </section>

      <div className="hidden min-w-0 grid-cols-1 gap-3 lg:grid lg:grid-cols-[1.65fr_1fr]">
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

      <section className="hidden lg:block">
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

      <section className="hidden lg:block">
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
