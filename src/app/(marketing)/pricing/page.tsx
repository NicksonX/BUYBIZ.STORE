import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Minus,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { MarketingPageHero, HeroLink } from "@/components/marketing/page-hero";
import { PlanCard } from "@/components/marketplace/plan-card";
import { Alert } from "@/components/ui/alert";
import type { PlanAvailability } from "@/lib/db/types";
import { getPlanAvailability } from "@/server/data/products";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "BUYBIZ proxy plans: 24 hours for ₦500, 7 days for ₦1,000, 30 days for ₦3,000. Shared proxy access with clear expiry and no auto-renewal.",
};

export const dynamic = "force-dynamic";

const comparison = [
  { label: "Access window", values: ["24 hours", "7 days", "30 days"] },
  { label: "Price (NGN)", values: ["₦500", "₦1,000", "₦3,000"] },
  { label: "Wallet purchase", values: [true, true, true] },
  { label: "Instant allocation", values: [true, true, true] },
  { label: "Shared proxy", values: [true, true, true] },
  { label: "Maximum customers per upstream", values: ["10", "10", "10"] },
  { label: "Expiry starts at", values: ["Allocation", "Allocation", "Allocation"] },
  { label: "Auto-renewal", values: ["No", "No", "No"] },
  { label: "No-stock wallet refund", values: [true, true, true] },
];

export default async function PricingPage() {
  let plans: PlanAvailability[] = [];
  let error = false;
  try {
    plans = await getPlanAvailability();
  } catch {
    error = true;
  }

  return (
    <>
      <MarketingPageHero
        eyebrow="Pricing"
        title={
          <>
            Three plans.
            <br />
            <span className="text-silver">One wallet.</span>
          </>
        }
        description="Pick 24 hours, 7 days or 30 days. Prices are in naira and paid from your wallet, with no extra BUYBIZ fees at checkout."
        actions={
          <>
            <HeroLink href="/marketplace">Choose a plan</HeroLink>
            <HeroLink href="/how-it-works" secondary>
              How allocation works
            </HeroLink>
          </>
        }
        aside={
          <div className="rounded-[16px] border border-white/10 bg-white/[0.035] p-4 text-white">
            <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-white/35">
              <Wallet className="h-3 w-3" /> Wallet-first checkout
            </p>
            <div className="mt-3 space-y-2">
              {[
                ["24 hours", "₦500"],
                ["7 days", "₦1,000"],
                ["30 days", "₦3,000"],
              ].map(([label, price]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-white/45">{label}</span>
                  <span className="tabular text-[12px] font-medium">{price}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-1.5 border-t border-white/[0.08] pt-3 text-[8.5px] leading-4 text-white/30">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
              Up to 10 customers share one upstream proxy. Not a dedicated IP.
            </div>
          </div>
        }
      />

      <section className="bg-[#F4F4F5] py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          {error ? (
            <Alert tone="warning" title="Live pricing could not be loaded">
              The database is temporarily unavailable. Please refresh before
              relying on plan availability.
            </Alert>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.product.id}
                product={plan.product}
                availability={plan}
                featured={plan.product.slug === "proxy-30-days"}
              />
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-[#6E7178]">
            Availability is checked live. A plan is only purchasable when at
            least one upstream proxy has a free seat and enough remaining
            lifetime to cover the full package plus a safety buffer.
          </p>

          <div className="mt-12 overflow-hidden rounded-[18px] border border-black/[0.06] bg-white">
            <div className="border-b border-black/[0.06] px-5 py-4">
              <h2 className="text-[16px] font-semibold tracking-[-0.025em] text-[#0A0B0D]">
                Compare plans
              </h2>
              <p className="mt-1 text-[10.5px] text-[#6E7178]">
                Launch products only. Coming-soon services have no price.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#F9F9FA]">
                    <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8C9097]">
                      Feature
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-[#0A0B0D]">
                      24-Hour Proxy
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-[#0A0B0D]">
                      7-Day Proxy
                    </th>
                    <th className="px-5 py-3 text-[10px] font-semibold text-[#0A0B0D]">
                      30-Day Proxy
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.055]">
                  {comparison.map((row) => (
                    <tr key={row.label}>
                      <td className="px-5 py-3 text-[10.5px] text-[#6E7178]">
                        {row.label}
                      </td>
                      {row.values.map((value, index) => (
                        <td
                          key={`${row.label}-${index}`}
                          className="px-5 py-3 text-[10.5px] font-medium text-[#0A0B0D]"
                        >
                          {value === true ? (
                            <Check className="h-3.5 w-3.5 text-[#16794A]" />
                          ) : value === false ? (
                            <Minus className="h-3.5 w-3.5 text-[#0A0B0D]/25" />
                          ) : (
                            value
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-[14px] border border-black/[0.055] bg-white p-5">
              <h3 className="text-[11.5px] font-semibold text-[#0A0B0D]">
                What you are buying
              </h3>
              <p className="mt-2 text-[10px] leading-5 text-[#6E7178]">
                A fixed BUYBIZ access window to a manually supplied upstream
                proxy. Connection details appear after allocation and stay in
                your dashboard until expiry.
              </p>
            </div>
            <div className="rounded-[14px] border border-black/[0.055] bg-white p-5">
              <h3 className="text-[11.5px] font-semibold text-[#0A0B0D]">
                What is not included
              </h3>
              <p className="mt-2 text-[10px] leading-5 text-[#6E7178]">
                Dedicated IPs, separate upstream credentials per customer,
                auto-renewal, cash withdrawal, or virtual numbers/PayPal
                services. Those are not part of the launch product.
              </p>
            </div>
            <div className="rounded-[14px] border border-black/[0.055] bg-white p-5">
              <h3 className="text-[11.5px] font-semibold text-[#0A0B0D]">
                If we cannot fulfil
              </h3>
              <p className="mt-2 text-[10px] leading-5 text-[#6E7178]">
                If no eligible proxy exists at confirmation time, the order is
                recorded and the full amount is credited back to your BUYBIZ
                wallet automatically. No silent charge.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[18px] bg-[#0A0B0D] p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-[18px] font-semibold tracking-[-0.03em]">
                Ready to choose an access window?
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                Create a free account, fund your wallet and buy in NGN.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[11px] font-semibold text-[#0A0B0D]"
            >
              Browse the marketplace <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
