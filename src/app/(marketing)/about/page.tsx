import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  Layers3,
  Network,
  Phone,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { MarketingPageHero, HeroLink } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "About",
  description:
    "BUYBIZ is a Nigeria-focused digital marketplace. Learn what is live today, what is planned, and the principles behind the product.",
};

export default function AboutPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="About BUYBIZ"
        title={
          <>
            A simple way
            <br />
            <span className="text-silver">to buy digital access.</span>
          </>
        }
        description="BUYBIZ is a Nigeria-focused marketplace for digital services. We're starting with shared proxy access paid from a naira wallet, and we'll add new services only when they're ready."
        actions={
          <>
            <HeroLink href="/marketplace">Explore proxies</HeroLink>
            <HeroLink href="/how-it-works" secondary>
              How it works
            </HeroLink>
          </>
        }
        aside={
          <div className="w-full max-w-[300px] rounded-[16px] border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Live today
            </p>
            <div className="mt-3 space-y-2.5">
              {[
                { icon: Network, label: "Shared proxy access" },
                { icon: Wallet, label: "NGN BUYBIZ wallet" },
                { icon: CircleDollarSign, label: "Paystack deposits" },
                { icon: ShieldCheck, label: "Automatic no-stock refunds" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <item.icon className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-[10.5px] text-white/65">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/[0.08] pt-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Planned, not live
              </p>
              <p className="mt-1.5 text-[10px] text-white/40">
                Virtual phone numbers · PayPal services
              </p>
            </div>
          </div>
        }
      />

      <section className="bg-[#F4F4F5] py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium text-[#8C9097]">
                Why BUYBIZ exists
              </p>
              <h2 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#0A0B0D] sm:text-[36px]">
                Why we started with proxies.
              </h2>
            </div>
            <div className="space-y-4 text-[13px] leading-6 text-[#5F626A]">
              <p>
                Buying digital access in Nigeria is often messy. Different
                vendors, unclear prices, and terms that hide the parts that
                matter. We wanted one place where the price, the expiry and the
                limits are easy to see.
              </p>
              <p>
                So we built a wallet you can top up in naira and use to buy
                proxy access. Your prices, expiry and allocation status are all
                in your account. If a proxy can't be allocated, the order is
                recorded and the money goes back to your wallet.
              </p>
              <p>
                We're starting with one live product because doing it well
                matters more than launching many half-finished ones. You won't
                find invented customer counts or uptime guarantees here.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Network,
                title: "One live product",
                copy: "Proxy access in 24-hour, 7-day and 30-day windows.",
              },
              {
                icon: Wallet,
                title: "Wallet-first",
                copy: "Fund once in NGN and buy without re-entering card details.",
              },
              {
                icon: Users,
                title: "Honest capacity",
                copy: "Other active customers share one upstream proxy.",
              },
              {
                icon: Layers3,
                title: "Clear roadmap",
                copy: "New categories are published only when they are ready.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[14px] border border-black/[0.055] bg-white p-4"
              >
                <item.icon className="h-4 w-4 text-[#0A0B0D]/60" strokeWidth={1.7} />
                <h3 className="mt-4 text-[12px] font-semibold text-[#0A0B0D]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[10.5px] leading-[1.65] text-[#6E7178]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto grid w-full max-w-[1100px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <p className="text-[11px] font-medium text-[#8C9097]">
              What we will not do
            </p>
            <h2 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0A0B0D] sm:text-[34px]">
              What we won't tell you.
            </h2>
            <p className="mt-3 max-w-[420px] text-[12.5px] leading-6 text-[#6E7178]">
              Trust comes from being clear about what a product can't do.
            </p>
          </div>
          <div className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
            {[
              {
                title: "We won't call a shared proxy a dedicated IP.",
                copy: "Shared plans use the same credentials and IP as other active customers. Your access period is separate, but the network identity isn't. The Personal plan is limited to one customer per proxy.",
              },
              {
                title: "We won't promise individual network revocation.",
                copy: "When your package ends, we hide your details and close your access in our system. We can't revoke only your access to shared upstream credentials at the network level.",
              },
              {
                title: "We won't sell what isn't ready.",
                copy: "Phone numbers and PayPal services are marked Coming Soon. No price, no checkout, no waitlist.",
              },
              {
                title: "We won't invent numbers.",
                copy: "No made-up customer counts, growth figures or reviews. The charts you see come from real database records.",
              },
            ].map((item) => (
              <div key={item.title} className="py-4">
                <div className="flex items-start gap-2.5">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A0B0D]/45" />
                  <div>
                    <p className="text-[12px] font-medium text-[#0A0B0D]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[10.5px] leading-[1.65] text-[#6E7178]">
                      {item.copy}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F4F4F5] py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <p className="text-[11px] font-medium text-[#8C9097]">
            The roadmap
          </p>
          <h2 className="mt-3 max-w-[620px] text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0A0B0D] sm:text-[34px]">
            One product at a time.
          </h2>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              {
                number: "01",
                icon: Network,
                title: "Proxy access",
                status: "Live now",
                copy: "Three fixed durations, wallet checkout, live seat checks and automatic wallet refunds.",
              },
              {
                number: "02",
                icon: Phone,
                title: "Virtual phone numbers",
                status: "Planned",
                copy: "A future service for verification and messages. Scope and pricing aren't final.",
              },
              {
                number: "03",
                icon: CreditCard,
                title: "PayPal services",
                status: "Planned",
                copy: "A future category. It needs legal and compliance review before we can offer it.",
              },
            ].map((item) => (
              <div
                key={item.number}
                className="relative overflow-hidden rounded-[16px] border border-black/[0.06] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#0A0B0D]/30">
                    {item.number}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[8.5px] font-medium ${
                      item.status === "Live now"
                        ? "bg-[#E7F6EE] text-[#116B40]"
                        : "bg-[#F1F1F3] text-[#6E7178]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <item.icon className="mt-6 h-4 w-4 text-[#0A0B0D]/50" />
                <h3 className="mt-2 text-[13px] font-semibold text-[#0A0B0D]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[10.5px] leading-[1.65] text-[#6E7178]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[18px] bg-[#0A0B0D] p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-[18px] font-semibold tracking-[-0.03em]">
                Start with a wallet and a plan.
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                Proxy access is live. Everything else is clearly marked.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/marketplace"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[11px] font-semibold text-[#0A0B0D]"
              >
                View proxies <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-9 items-center rounded-full border border-white/15 px-4 text-[11px] text-white/70 hover:bg-white/[0.06]"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
