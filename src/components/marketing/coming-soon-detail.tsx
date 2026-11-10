import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Ban, Clock3, ShieldCheck, type LucideIcon } from "lucide-react";
import { MarketingPageHero } from "@/components/marketing/page-hero";

export function ComingSoonDetail({
  eyebrow,
  title,
  description,
  icon: Icon,
  scope,
  limitations,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  scope: string[];
  limitations: string[];
}) {
  return (
    <>
      <MarketingPageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        compact
        aside={
          <div className="w-full max-w-[260px] rounded-[16px] border border-white/10 bg-white/[0.035] p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.05] text-white/70">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[10px] font-semibold text-white">
              Not available to purchase
            </p>
            <p className="mt-1 text-[9.5px] leading-4 text-white/35">
              No price, checkout, waitlist or launch date has been opened for this
              service.
            </p>
          </div>
        }
        actions={
          <>
            <Link
              href="/coming-soon"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/15 px-4 text-[11px] text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to roadmap
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[11px] font-semibold text-[#0A0B0D]"
            >
              Shop live proxies <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      <section className="bg-[#F4F4F5] py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-[1000px] gap-4 px-5 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[16px] border border-black/[0.06] bg-white p-5 sm:p-6">
            <h2 className="text-[14px] font-semibold text-[#0A0B0D]">
              What is being explored
            </h2>
            <ul className="mt-4 space-y-2.5">
              {scope.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[11px] leading-5 text-[#6E7178]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#0A0B0D]/35" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="rounded-[14px] border border-black/[0.06] bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A0B0D]">
                <Ban className="h-3.5 w-3.5" /> What this is not
              </h2>
              <ul className="mt-2 space-y-2 text-[9.5px] leading-4 text-[#6E7178]">
                {limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-[14px] border border-[#946200]/15 bg-[#FDF4E3] p-4">
              <h2 className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#946200]">
                <Clock3 className="h-3.5 w-3.5" /> No launch date promised
              </h2>
              <p className="mt-1.5 text-[9px] leading-4 text-[#946200]/80">
                BUYBIZ will publish scope, pricing, provider details and legal
                information only when the service is ready to operate.
              </p>
            </div>

            <div className="flex items-start gap-1.5 rounded-[10px] px-1 text-[8.5px] leading-4 text-[#6E7178]">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
              Do not send payment or identity documents for a planned service.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
