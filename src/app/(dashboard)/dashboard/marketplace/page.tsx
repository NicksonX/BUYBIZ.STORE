import Link from "next/link";
import { ArrowUpRight, CreditCard, Layers3, Network, Phone, Plus, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PlanCard } from "@/components/marketplace/plan-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUserPage } from "@/server/auth/guards";
import { getAvailablePlans, getWalletSummary } from "@/server/data/customer";
import { getComingSoonProducts } from "@/server/data/products";
import { cn, formatNaira } from "@/lib/utils";
import type { Product } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const filters = [
  { key: "all", label: "All services" },
  { key: "proxy", label: "Proxy plans" },
  { key: "coming-soon", label: "Coming soon" },
] as const;

function comingSoonIcon(product: Product) {
  if (product.category === "phone_numbers") return Phone;
  if (product.category === "paypal") return CreditCard;
  return Layers3;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.category) ? params.category[0] : params.category;
  const activeFilter = filters.some((filter) => filter.key === raw)
    ? (raw as (typeof filters)[number]["key"])
    : "all";

  const user = await requireUserPage();
  const [plans, comingSoon, wallet] = await Promise.all([
    getAvailablePlans(),
    getComingSoonProducts(),
    getWalletSummary(user.id),
  ]);

  const showProxy = activeFilter === "all" || activeFilter === "proxy";
  const showComing = activeFilter === "all" || activeFilter === "coming-soon";

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Pick a proxy plan."
        description="Live stock and naira prices. Pay from your wallet. No card details are stored by BUYBIZ."
        actions={
          <Link
            href="/dashboard/wallet"
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              "hidden h-9 rounded-full px-3.5 lg:inline-flex",
            )}
          >
            <Plus className="h-3.5 w-3.5" /> Add funds
          </Link>
        }
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[208px_1fr]">
        <aside className="hidden space-y-3 lg:block">
          <div className="surface-card rounded-[13px] p-2">
            <p className="px-2.5 pb-1.5 pt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Categories
            </p>
            <nav aria-label="Marketplace categories" className="space-y-0.5">
              {filters.map((filter) => (
                <Link
                  key={filter.key}
                  href={
                    filter.key === "all"
                      ? "/dashboard/marketplace"
                      : `/dashboard/marketplace?category=${filter.key}`
                  }
                  aria-current={activeFilter === filter.key ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[11.5px] font-medium transition-colors",
                    activeFilter === filter.key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {filter.key === "proxy" ? (
                    <Network className="h-3.5 w-3.5" />
                  ) : filter.key === "coming-soon" ? (
                    <Layers3 className="h-3.5 w-3.5" />
                  ) : (
                    <Layers3 className="h-3.5 w-3.5" />
                  )}
                  {filter.label}
                  <span
                    className={cn(
                      "ml-auto text-[9px]",
                      activeFilter === filter.key
                        ? "text-background/55"
                        : "text-muted-foreground/60",
                    )}
                  >
                    {filter.key === "proxy"
                      ? plans.length
                      : filter.key === "coming-soon"
                        ? comingSoon.length
                        : plans.length + comingSoon.length}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="relative overflow-hidden rounded-[13px] border border-[#22252a] bg-[#0A0B0D] p-3.5 text-white">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/[0.08] blur-2xl" />
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.06]">
                <Wallet className="h-3 w-3 text-white/60" />
              </span>
              <p className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                Your wallet
              </p>
            </div>
            <p className="tabular mt-3 text-[18px] font-semibold tracking-[-0.04em]">
              {formatNaira(wallet.balanceMinor, { exact: true })}
            </p>
            <p className="mt-1 text-[8.5px] text-white/30">Available to spend</p>
            <Link
              href="/dashboard/wallet"
              className="mt-3 inline-flex h-7 w-full items-center justify-center gap-1 rounded-full bg-white text-[9.5px] font-semibold text-[#0A0B0D]"
            >
              Add funds <Plus className="h-2.5 w-2.5" />
            </Link>
          </div>

          <div className="rounded-[12px] border border-border bg-surface-subtle p-3">
            <p className="text-[9.5px] font-medium text-foreground">
              Shared proxy disclosure
            </p>
            <p className="mt-1 text-[9px] leading-4 text-muted-foreground">
              Shared plans use the same upstream proxy credentials as other active customers
              and outgoing IP. This is not a dedicated IP product.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[12px] border border-[#22252a] bg-[#0A0B0D] p-3.5 text-white lg:hidden">
            <div>
              <p className="text-[10px] text-white/40">Wallet balance</p>
              <p className="tabular mt-1 text-[17px] font-semibold leading-none tracking-[-0.03em]">
                {formatNaira(wallet.balanceMinor, { exact: true })}
              </p>
            </div>
            <Link
              href="/dashboard/wallet"
              className="tap-target inline-flex h-11 items-center gap-1 rounded-full bg-white px-3.5 text-[11.5px] font-semibold text-[#0A0B0D] sm:h-8 sm:text-[10px]"
            >
              <Plus className="h-3 w-3" /> Add funds
            </Link>
          </div>
          <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {filters.map((filter) => (
              <Link
                key={filter.key}
                href={
                  filter.key === "all"
                    ? "/dashboard/marketplace"
                    : `/dashboard/marketplace?category=${filter.key}`
                }
                className={cn(
                  "tap-target inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-[11.5px] font-medium sm:min-h-7 sm:text-[10px]",
                  activeFilter === filter.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground",
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          {showProxy ? (
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold tracking-[-0.02em]">
                  Proxy access
                </h2>
                <span className="text-[9.5px] text-muted-foreground">
                  {plans.filter((plan) => plan.available).length} of {plans.length} available
                </span>
              </div>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.product.id}
                    product={plan.product}
                    availability={plan}
                    featured={plan.product.slug === "proxy-30-days"}
                    ctaLabel="Buy with wallet"
                  />
                ))}
              </div>
              <div className="mt-3 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[9.5px] leading-4 text-muted-foreground">
                Availability is checked live. A plan is only purchasable when at
                least one upstream proxy has a free seat and enough remaining
                lifetime for the full package plus the configured safety buffer.
              </div>
            </section>
          ) : null}

          {showComing ? (
            <section className={cn(showProxy && "mt-8")}>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold tracking-[-0.02em]">
                  Coming soon
                </h2>
                <span className="text-[9.5px] text-muted-foreground">
                  Not purchasable
                </span>
              </div>
              <div className="grid gap-2.5 md:grid-cols-2">
                {comingSoon.map((product) => {
                  const Icon = comingSoonIcon(product);
                  return (
                    <Link
                      key={product.id}
                      href={
                        product.category === "phone_numbers"
                          ? "/coming-soon/phone-numbers"
                          : "/coming-soon/paypal"
                      }
                      className="group surface-card relative overflow-hidden rounded-[16px] p-5 transition-colors hover:border-border-strong"
                    >
                      <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full border border-border" />
                      <div className="flex items-start justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-surface-subtle">
                          <Icon className="h-4 w-4" />
                        </span>
                        <Badge tone="neutral">Coming soon</Badge>
                      </div>
                      <h3 className="mt-7 text-[15px] font-semibold tracking-[-0.02em]">
                        {product.name}
                      </h3>
                      <p className="mt-1.5 max-w-[340px] text-[10.5px] leading-5 text-muted-foreground">
                        {product.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-foreground/60 group-hover:text-foreground">
                        Read the service note <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-3 text-[9.5px] text-muted-foreground">
                Coming-soon services have no price and no checkout. BUYBIZ will
                publish details only when they are genuinely available.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
