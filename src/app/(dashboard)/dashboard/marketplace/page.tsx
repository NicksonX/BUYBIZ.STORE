import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  Layers3,
  Network,
  Phone,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PlanCard } from "@/components/marketplace/plan-card";
import { Badge } from "@/components/ui/badge";
import { requireUserPage } from "@/server/auth/guards";
import { getAvailablePlans } from "@/server/data/customer";
import { getComingSoonProducts } from "@/server/data/products";
import { getInventoryCountries } from "@/server/data/countries";
import { allCountries, countryFlag } from "@/lib/ai/countries";
import { CountrySearchSelect } from "@/components/marketplace/country-search-select";
import { cn } from "@/lib/utils";
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
  const requestedCountry = Array.isArray(params.country) ? params.country[0] : params.country;
  const countryCode = /^[A-Za-z]{2}$/.test(requestedCountry ?? "") ? requestedCountry!.toUpperCase() : null;

  await requireUserPage();
  const [plans, comingSoon, countries] = await Promise.all([
    getAvailablePlans(countryCode ?? undefined),
    getComingSoonProducts(),
    getInventoryCountries(),
  ]);

  const inventoryByCode = new Map(countries.map((country) => [country.code, country]));
  const countryOptions = allCountries()
    .map((country) => ({
      ...country,
      available: inventoryByCode.get(country.code)?.available ?? 0,
      configured: inventoryByCode.has(country.code),
    }))
    .filter((country) => country.available > 0);
  const selectedCountry = countryCode ? countryOptions.find((country) => country.code === countryCode) : null;
  const countryMissing = Boolean(countryCode && !selectedCountry);
  const showProxy = activeFilter === "all" || activeFilter === "proxy";
  const showComing = activeFilter === "all" || activeFilter === "coming-soon";

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Pick a proxy plan."
        description="Choose a country, review the plan and pay from your BUYBIZ wallet. Availability is checked against live inventory."
        actions={
          <Link
            href="/how-it-works"
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-[12px] font-medium hover:bg-accent sm:h-9 sm:px-3.5 sm:text-[11px]"
          >
            How it works <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="mt-5">
        <section className="surface-card rounded-[14px] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Proxy location</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Choose where your proxy should exit. Availability is live.</p>
            </div>
            <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[9px] text-muted-foreground">{countryCode ?? "Available countries"}</span>
          </div>
          <div className="mt-3"><CountrySearchSelect basePath="/dashboard/marketplace" selectedCode={countryCode} countries={countryOptions} extraQuery={activeFilter !== "all" ? { category: activeFilter } : {}} /></div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 sm:flex-wrap">
            {countries.map((country) => (
              <Link key={country.code} href={`/dashboard/marketplace?country=${country.code}`} className={cn("tap-target inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[10.5px] font-medium", countryCode === country.code ? "border-foreground bg-foreground text-background" : "border-border bg-surface text-muted-foreground")}>
                <span className="text-[14px]">{countryFlag(country.code)}</span>
                {country.name}
                <span className={cn("text-[8.5px]", country.available > 0 ? "text-success" : "text-warning")}>{country.available > 0 ? "Available" : "Out of Stock"}</span>
              </Link>
            ))}
          </div>
          {countryMissing ? <p className="mt-2 text-[9.5px] text-warning">This country has no verified, available proxy inventory right now. Choose an available country.</p> : null}
          {selectedCountry && !selectedCountry.configured ? <p className="mt-2 text-[9.5px] text-warning">Sorry, there are currently no proxies available for this location. Please select another country.</p> : null}
          {selectedCountry && selectedCountry.configured && selectedCountry.available === 0 ? <p className="mt-2 text-[9.5px] text-warning">Currently Out of Stock. There are no verified, available proxies for {selectedCountry.name}.</p> : null}
          {!selectedCountry && countries.length === 0 ? <p className="mt-2 text-[9.5px] text-warning">No proxy inventory has been added yet. Check back shortly.</p> : null}
        </section>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav
            aria-label="Marketplace categories"
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1 sm:flex-wrap sm:overflow-visible"
          >
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
                  "tap-target inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[11.5px] font-medium transition-colors sm:min-h-8 sm:text-[10.5px]",
                  activeFilter === filter.key
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    "text-[9px]",
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
          <p className="hidden text-[10px] text-muted-foreground sm:block">
            {plans.filter((plan) => plan.available).length} of {plans.length} proxy plans available now
          </p>
        </div>

        {showProxy ? (
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
                  Proxy access
                </h2>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  Fixed prices. Fixed expiry. No automatic renewal.
                </p>
              </div>
              <span className="text-[9.5px] text-muted-foreground sm:hidden">
                {plans.filter((plan) => plan.available).length} of {plans.length} available
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.product.id}
                  product={plan.product}
                  availability={plan}
                  featured={plan.product.slug === "proxy-30-days"}
                  ctaLabel="Buy with wallet"
                  href={`/dashboard/checkout/${plan.product.slug}${countryCode ? `?country=${countryCode}` : ""}`}
                />
              ))}
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-border bg-surface-subtle px-3.5 py-3 text-[10px] leading-5 text-muted-foreground">
              <Network className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Shared plans use the same upstream proxy credentials as other
                active customers. The Personal plan is limited to one customer per
                proxy. Availability is checked live before checkout.
              </p>
            </div>
          </section>
        ) : null}

        {showComing ? (
          <section className={cn(showProxy && "mt-8")}>
            <div className="mb-3">
              <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
                Coming soon
              </h2>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                Planned services. No prices and no checkout.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
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
                    <div className="flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-border bg-surface-subtle">
                        <Icon className="h-4 w-4" />
                      </span>
                      <Badge tone="neutral">Coming soon</Badge>
                    </div>
                    <h3 className="mt-7 text-[15px] font-semibold tracking-[-0.02em]">
                      {product.name}
                    </h3>
                    <p className="mt-1.5 max-w-[340px] text-[11px] leading-5 text-muted-foreground">
                      {product.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-[10.5px] font-medium text-foreground/60 group-hover:text-foreground">
                      Read the service note <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="mt-3 text-[9.5px] text-muted-foreground">
              BUYBIZ will publish details only when these services are genuinely
              available.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
