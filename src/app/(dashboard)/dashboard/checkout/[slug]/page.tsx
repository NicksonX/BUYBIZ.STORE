import { notFound } from "next/navigation";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import {
  ArrowRight,
  Check,
  Clock3,
  Info,
  LockKeyhole,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CheckoutForm } from "@/components/marketplace/checkout-form";
import { ProxyUseCases } from "@/components/marketing/proxy-use-cases";
import { requireVerifiedUserPage } from "@/server/auth/guards";
import { getCheckoutData } from "@/server/data/customer";
import { getAppSettings } from "@/server/data/settings";
import {
  cn,
  formatDateTime,
  formatDuration,
  formatNaira,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const rawCountry = Array.isArray(query.country) ? query.country[0] : query.country;
  const countryCode = /^[A-Za-z]{2}$/.test(rawCountry ?? "") ? rawCountry!.toUpperCase() : null;
  const user = await requireVerifiedUserPage();
  const [{ plan, wallet }, settings] = await Promise.all([
    getCheckoutData(user.id, slug, countryCode ?? undefined),
    getAppSettings(),
  ]);

  if (!plan || plan.product.isComingSoon || !plan.product.isActive) {
    notFound();
  }

  const { product } = plan;
  const insufficient = wallet.balanceMinor < product.priceMinor;
  const idempotencyKey = randomUUID();
  const balanceAfter = wallet.balanceMinor - product.priceMinor;
  const canBuy = plan.available && !insufficient;

  return (
    <div>
      <PageHeader
        backHref="/dashboard/marketplace"
        backLabel="Back to marketplace"
        eyebrow="Confirm purchase"
        title="Review your proxy plan."
        description={countryCode ? `Selected location: ${countryCode}. Nothing is charged until you confirm.` : "Nothing is charged until you confirm. Your wallet is debited only inside the allocation transaction."}
      />

      <div className="mt-5 flex flex-col gap-4 lg:grid lg:grid-cols-[1.35fr_0.85fr]">
        <div className="order-2 space-y-3 lg:order-1">
          <section className="surface-card rounded-[16px] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-border bg-surface-subtle">
                  <Network className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold tracking-[-0.03em]">
                      {product.name}
                    </h2>
                    <Badge tone={plan.available ? "success" : "warning"}>
                      {plan.available ? "Available now" : "Unavailable"}
                    </Badge>
                  </div>
                  <p className="mt-1 max-w-[440px] text-[11px] leading-5 text-muted-foreground">
                    {product.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="tabular text-[26px] font-semibold leading-none tracking-[-0.045em]">
                  {formatNaira(product.priceMinor)}
                </p>
                <p className="mt-1 text-[9.5px] text-muted-foreground">
                  for {formatDuration(product.durationSeconds)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                {
                  icon: Clock3,
                  label: "Access window",
                  value: formatDuration(product.durationSeconds),
                },
                {
                  icon: Users,
                  label: "Allocation",
                  value:
                    product.accessType === "single"
                      ? "One customer"
                      : product.slug === "proxy-7-days"
                        ? "Shared · up to 20 users"
                        : "Shared access",
                },
                {
                  icon: ShieldCheck,
                  label: "Renewal",
                  value: "None. Fixed expiry.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[10px] border border-border bg-surface-subtle p-3"
                >
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="mt-2 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[11px] font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card rounded-[16px] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold">Before you confirm</h3>
              <Link href="/terms#proxy-service" className="text-[9.5px] text-muted-foreground underline underline-offset-2">
                Full terms
              </Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {[
                "You pay the exact plan price from your wallet. No BUYBIZ fee or tax is added.",
                product.accessType === "single" ? "This proxy is limited to one active customer, so your credentials are not shared with other customers." : "This proxy is shared with other active customers, who use the same credentials and IP.",
                "Your expiry starts at allocation, not at registration or wallet funding.",
                "If no proxy is available, the full amount is credited back to your wallet.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-[10.5px] leading-5 text-muted-foreground"
                >
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <div className="rounded-[12px] border border-border bg-surface-subtle p-4">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-[10px] leading-5 text-muted-foreground">
                <strong className="font-semibold text-foreground">
                  Upstream lifetime guard:
                </strong>{" "}
                inventory is only offered if its remaining lifetime covers your
                package plus a {Math.round(settings.allocationSafetyBufferSeconds / 60)}-minute safety buffer. This
                protects you from buying time the upstream proxy cannot provide.
              </p>
            </div>
          </div>
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-[84px] lg:self-start">
          <div className="surface-card overflow-hidden rounded-[16px]">
            <div className="border-b border-border p-5">
              <h2 className="text-[13px] font-semibold">Order summary</h2>
              <dl className="mt-4 space-y-2.5 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="text-right font-medium">{product.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="font-medium">{formatDuration(product.durationSeconds)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Wallet balance</dt>
                  <dd className="tabular font-medium">
                    {formatNaira(wallet.balanceMinor, { exact: true })}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Balance after</dt>
                  <dd
                    className={cn(
                      "tabular font-medium",
                      balanceAfter < 0 && "text-danger",
                    )}
                  >
                    {formatNaira(Math.max(0, balanceAfter), { exact: true })}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-border pt-2.5">
                  <dt className="font-medium">You pay</dt>
                  <dd className="tabular text-[15px] font-semibold">
                    {formatNaira(product.priceMinor, { exact: true })}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="p-5">
              <details className="surface-card rounded-[14px]">
                <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-semibold [&::-webkit-details-marker]:hidden">What can you use this proxy for?</summary>
                <div className="px-4 pb-4"><ProxyUseCases /></div>
              </details>
              <CheckoutForm
            countryCode={countryCode}
                productSlug={product.slug}
                idempotencyKey={idempotencyKey}
                priceMinor={product.priceMinor}
                balanceMinor={wallet.balanceMinor}
                available={plan.available}
                insufficient={insufficient}
                accessType={product.accessType}
              />
              {insufficient ? (
                <Link
                  href="/dashboard/wallet"
                  className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-border text-[11.5px] font-medium hover:bg-accent"
                >
                  Add funds to your wallet <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
            <LockKeyhole className="h-3 w-3" />
            Wallet purchase · server-side allocation
          </div>
        </aside>
      </div>
    </div>
  );
}
