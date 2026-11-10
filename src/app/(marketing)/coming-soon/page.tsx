import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  Layers3,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { MarketingPageHero, HeroLink } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Coming soon",
  description:
    "Services BUYBIZ plans to offer later. They are not available to purchase today.",
};

const services = [
  {
    name: "Virtual phone numbers",
    href: "/coming-soon/phone-numbers",
    icon: Phone,
    copy: "Planned for verification and communication use cases. No number list, country coverage or price is available yet, and there is no checkout.",
  },
  {
    name: "PayPal services",
    href: "/coming-soon/paypal",
    icon: CreditCard,
    copy: "A planned future category. BUYBIZ does not claim a PayPal partnership and does not currently offer PayPal account or payment services.",
  },
];

export default function ComingSoonPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Roadmap"
        title={
          <>
            Planned, not
            <br />
            <span className="text-silver">promised.</span>
          </>
        }
        description="These are future service categories. They have no prices, no checkout and no launch dates. We publish details only when a service is genuinely ready."
        actions={
          <>
            <HeroLink href="/marketplace">Shop live proxies</HeroLink>
            <HeroLink href="/faq" secondary>
              Read the FAQ
            </HeroLink>
          </>
        }
        compact
      />

      <section className="bg-[#F4F4F5] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-[1000px] px-5 sm:px-8">
          <div className="grid gap-3 md:grid-cols-2">
            {services.map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="group relative overflow-hidden rounded-[18px] border border-black/[0.06] bg-white p-6 transition-colors hover:border-black/15"
              >
                <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full border border-black/[0.04]" />
                <div className="pointer-events-none absolute -right-4 -top-6 h-28 w-28 rounded-full border border-black/[0.03]" />
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[11px] border border-black/[0.06] bg-[#F6F6F7]">
                    <service.icon className="h-5 w-5 text-[#0A0B0D]/65" />
                  </span>
                  <span className="rounded-full border border-black/[0.06] bg-[#F6F6F7] px-2.5 py-1 text-[9px] font-medium text-[#6E7178]">
                    Coming soon
                  </span>
                </div>
                <h2 className="mt-10 text-[20px] font-semibold tracking-[-0.03em] text-[#0A0B0D]">
                  {service.name}
                </h2>
                <p className="mt-2 max-w-[380px] text-[11px] leading-5 text-[#6E7178]">
                  {service.copy}
                </p>
                <span className="mt-5 inline-flex items-center gap-1 text-[10px] font-medium text-[#0A0B0D]/60 transition-colors group-hover:text-[#0A0B0D]">
                  Read the service note <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-[16px] border border-black/[0.06] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-black/[0.06] bg-[#F6F6F7]">
                <Layers3 className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-[13px] font-semibold text-[#0A0B0D]">
                  Why these services are visible but not purchasable
                </h2>
                <p className="mt-2 max-w-[620px] text-[10.5px] leading-5 text-[#6E7178]">
                  A roadmap should be clear without implying availability. These
                  cards exist so you know what BUYBIZ is exploring, while the live
                  product remains proxy access. There is no fake checkout, fake
                  number inventory or implied partnership.
                </p>
                <div className="mt-4 flex items-start gap-2 rounded-[9px] border border-[#946200]/15 bg-[#FDF4E3] px-3 py-2 text-[9px] leading-4 text-[#946200]">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                  Do not send payment or personal documents for these services.
                  They are not open.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
