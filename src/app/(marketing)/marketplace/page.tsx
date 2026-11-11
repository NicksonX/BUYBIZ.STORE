import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  Layers3,
  Network,
  Phone,
  RefreshCw,
} from "lucide-react";
import { MarketingPageHero, HeroLink } from "@/components/marketing/page-hero";
import { PlanCard } from "@/components/marketplace/plan-card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type { PlanAvailability, Product } from "@/lib/db/types";
import { getComingSoonProducts, getPlanAvailability } from "@/server/data/products";
import { getCurrentUser } from "@/server/auth/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Compare BUYBIZ proxy plans and see what is live now. Virtual phone numbers and PayPal services are coming soon.",
};

export const dynamic = "force-dynamic";

const categories = [
  { key: "all", label: "All services", icon: Layers3 },
  { key: "proxy", label: "Proxy plans", icon: Network },
  { key: "coming-soon", label: "Coming soon", icon: RefreshCw },
] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function comingIcon(product: Product) {
  return product.category === "phone_numbers" ? Phone : CreditCard;
}

export default async function PublicMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = first(params.category);
  const active = categories.some((category) => category.key === raw)
    ? (raw as (typeof categories)[number]["key"])
    : "all";
  const [plans, comingSoon, user] = await Promise.all([
    getPlanAvailability().catch(() => [] as PlanAvailability[]),
    getComingSoonProducts().catch(() => [] as Product[]),
    getCurrentUser().catch(() => null),
  ]);

  const showProxy = active === "all" || active === "proxy";
  const showComing = active === "all" || active === "coming-soon";

  return (
    <>
      <MarketingPageHero
        eyebrow="Marketplace"
        title={
          <>
            Proxy access,
            <br />
            <span className="text-silver">ready when you are.</span>
          </>
        }
        description="Proxy access is live in three durations. Phone numbers and PayPal services are shown only so you know what's planned."
        actions={
          <>
            <HeroLink href={user ? "/dashboard/marketplace" : "/register"}>
              {user ? "Open dashboard marketplace" : "Create an account"}
            </HeroLink>
            <HeroLink href="/pricing" secondary>
              Compare prices
            </HeroLink>
          </>
        }
      />

      <section className="bg-[#F4F4F5] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="mb-6 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <Link
                key={category.key}
                href={
                  category.key === "all"
                    ? "/marketplace"
                    : `/marketplace?category=${category.key}`
                }
                aria-current={active === category.key ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[10.5px] font-medium transition-colors",
                  active === category.key
                    ? "border-[#0A0B0D] bg-[#0A0B0D] text-white"
                    : "border-black/[0.08] bg-white text-[#6E7178] hover:text-[#0A0B0D]",
                )}
              >
                <category.icon className="h-3.5 w-3.5" />
                {category.label}
              </Link>
            ))}
          </div>

          {showProxy ? (
            <section>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#8C9097]">
                    Live product
                  </p>
                  <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[#0A0B0D]">
                    Proxy access
                  </h2>
                </div>
                <p className="text-[10px] text-[#6E7178]">
                  {plans.filter((plan) => plan.available).length} of {plans.length} plans available
                </p>
              </div>
              {plans.length === 0 ? (
                <Alert tone="warning" title="Live plans are temporarily unavailable">
                  The product catalogue could not be loaded. Please refresh.
                </Alert>
              ) : (
                <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 2xl:grid-cols-4">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.product.id}
                      product={plan.product}
                      availability={plan}
                      featured={plan.product.slug === "proxy-30-days"}
                      href={
                        user
                          ? `/dashboard/checkout/${plan.product.slug}`
                          : `/register?next=${encodeURIComponent(
                              `/dashboard/checkout/${plan.product.slug}`,
                            )}`
                      }
                      ctaLabel={user ? "Buy with wallet" : "Sign up to buy"}
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-[10px] border border-black/[0.055] bg-white px-4 py-3 text-[9.5px] leading-4 text-[#6E7178]">
                Shared plans use the same credentials and outgoing IP as other
                active customers. BUYBIZ does not claim a dedicated IP or
                per-customer network revocation. The Personal plan is limited to
                one customer per proxy.
              </div>
            </section>
          ) : null}

          {showComing ? (
            <section className={cn(showProxy && "mt-10")}>
              <div className="mb-3">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#8C9097]">
                  Planned
                </p>
                <h2 className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-[#0A0B0D]">
                  Coming soon
                </h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {comingSoon.map((product) => {
                  const Icon = comingIcon(product);
                  return (
                    <Link
                      key={product.id}
                      href={
                        product.category === "phone_numbers"
                          ? "/coming-soon/phone-numbers"
                          : "/coming-soon/paypal"
                      }
                      className="group relative overflow-hidden rounded-[16px] border border-black/[0.06] bg-white p-5 transition-colors hover:border-black/15"
                    >
                      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full border border-black/[0.04]" />
                      <div className="flex items-start justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-black/[0.06] bg-[#F6F6F7]">
                          <Icon className="h-4 w-4 text-[#0A0B0D]/70" />
                        </span>
                        <Badge tone="neutral">Coming soon</Badge>
                      </div>
                      <h3 className="mt-7 text-[15px] font-semibold text-[#0A0B0D]">
                        {product.name}
                      </h3>
                      <p className="mt-1.5 max-w-[360px] text-[10.5px] leading-5 text-[#6E7178]">
                        {product.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-medium text-[#0A0B0D]/55 group-hover:text-[#0A0B0D]">
                        Read the service note <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-3 text-[9.5px] text-[#6E7178]">
                Coming-soon services have no prices and cannot be purchased.
              </p>
            </section>
          ) : null}
        </div>
      </section>
    </>
  );
}
