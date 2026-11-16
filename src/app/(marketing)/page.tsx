import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { LogoMark } from "@/components/brand/logo";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Globe2,
  Headphones,
  Layers3,
  LifeBuoy,
  LockKeyhole,
  Network,
  Phone,
  ReceiptText,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { PlanCard } from "@/components/marketplace/plan-card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { PlanAvailability } from "@/lib/db/types";
import { getPlanAvailability } from "@/server/data/products";
import { getFeaturedCampaign } from "@/server/services/campaigns";
import { CampaignCard } from "@/components/campaigns/campaign-card";

export const dynamic = "force-dynamic";

const popularServices = [
  {
    name: "Proxies",
    eyebrow: "Live now",
    description: "Shared and personal access",
    href: "/marketplace",
    icon: Network,
    live: true,
  },
  {
    name: "Virtual numbers",
    eyebrow: "Coming soon",
    description: "Verification and messages",
    href: "/coming-soon/phone-numbers",
    icon: Phone,
    live: false,
  },
  {
    name: "PayPal services",
    eyebrow: "Coming soon",
    description: "A future service category",
    href: "/coming-soon/paypal",
    icon: CreditCard,
    live: false,
  },
  {
    name: "More services",
    eyebrow: "Roadmap",
    description: "Announced when ready",
    href: "/coming-soon",
    icon: Layers3,
    live: false,
  },
];

const trustPoints = [
  {
    icon: Zap,
    title: "Instant allocation",
    copy: "When eligible stock is available",
  },
  {
    icon: ShieldCheck,
    title: "Server-verified payments",
    copy: "Credited only after verification",
  },
  {
    icon: Headphones,
    title: "Support in your dashboard",
    copy: "Every reply stays in your account",
  },
  {
    icon: Globe2,
    title: "Naira-first pricing",
    copy: "No dollar card required",
  },
];

const benefits = [
  {
    icon: Wallet,
    title: "Pay from your wallet",
    copy: "Top up in naira and see the full price before you confirm. No card details are stored by BUYBIZ.",
  },
  {
    icon: Users,
    title: "Shared access, explained",
    copy: "Shared with other active customers on the same upstream. We don't call it a dedicated IP.",
  },
  {
    icon: ShieldCheck,
    title: "Refunds when we cannot deliver",
    copy: "If we can't allocate a proxy, the full amount goes back to your wallet in the same transaction.",
  },
  {
    icon: ReceiptText,
    title: "Every payment leaves a record",
    copy: "Deposits, purchases, refunds and adjustments all show up in your wallet history.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create your account",
    copy: "Choose a username and verify your email. You'll need this before buying.",
    icon: BadgeCheck,
  },
  {
    number: "02",
    title: "Fund your wallet",
    copy: "Add money with Paystack. Your wallet is credited only after we verify the payment.",
    icon: CircleDollarSign,
  },
  {
    number: "03",
    title: "Choose a proxy plan",
    copy: "Pick 24 hours, 7 days, 30 days or a Personal 30-day proxy. We check stock and the proxy's remaining life before charging.",
    icon: Network,
  },
  {
    number: "04",
    title: "Receive connection details",
    copy: "Your expiry and shared connection details appear in My Proxies. Copy them whenever you need.",
    icon: LockKeyhole,
  },
];

const faqs = [
  {
    q: "What can I buy on BUYBIZ right now?",
    a: "Proxy access is live in three durations: 24 hours for ₦500, 7 days for ₦1,000 and 30 days for ₦3,000. Virtual phone numbers and PayPal-related services are planned only, are marked Coming Soon, and cannot be purchased.",
  },
  {
    q: "What exactly is a BUYBIZ proxy plan?",
    a: "You receive a period of authorized access to a shared upstream proxy that BUYBIZ has added to its inventory. Other active customers may use the same upstream credentials and outgoing IP. The Personal 30-Day Proxy is limited to one customer per proxy.",
  },
  {
    q: "What happens if there is no proxy stock?",
    a: "Checkout is disabled when no eligible inventory exists. If stock runs out during a confirmed purchase attempt, the order is recorded and the full amount is automatically returned to your BUYBIZ wallet through a linked refund entry.",
  },
  {
    q: "Can I withdraw my BUYBIZ balance?",
    a: "No. BUYBIZ wallet credit is an internal purchasing balance for BUYBIZ services and is not cash-withdrawable in the initial release. No withdrawal button is offered.",
  },
  {
    q: "Does access renew automatically?",
    a: "No. Each plan has a fixed expiry calculated from successful allocation: 24 hours, 7 × 24 hours or 30 × 24 hours. You decide whether to buy again.",
  },
  {
    q: "Can BUYBIZ revoke only my access to a shared proxy?",
    a: "BUYBIZ ends your entitlement in its own database when your package expires and hides the connection details. Because upstream credentials are shared, we cannot technically revoke only one customer's network access without disrupting others. We say so plainly.",
  },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const marketingTheme =
    cookieStore.get("buybiz_marketing_theme")?.value === "dark" ? "dark" : "light";
  let plans: PlanAvailability[] = [];
  let plansError = false;
  const campaign = await getFeaturedCampaign().catch(() => null);
  try {
    plans = await getPlanAvailability();
  } catch (error) {
    console.error("[buybiz/home] product availability unavailable", error);
    plansError = true;
  }

  return (
    <div className={cn("marketing-home", marketingTheme === "dark" && "dark")}>
      <section className="marketing-light-section relative overflow-hidden bg-[#F4F4F5] text-[#0A0B0D] dark:bg-[#08090B]">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[54%] lg:block">
          <Image
            src="/marketing/hero-customer-v2.jpg"
            alt="A customer using a laptop"
            fill
            priority
            sizes="55vw"
            className="marketing-kenburns object-cover object-[38%_42%] grayscale contrast-[1.04] [clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)]"
          />
          <div className="marketing-hero-fade-left absolute inset-0 bg-[linear-gradient(90deg,#F4F4F5_0%,rgba(244,244,245,0.76)_8%,rgba(244,244,245,0.08)_34%,rgba(244,244,245,0)_62%)]" />
          <div className="marketing-hero-fade-bottom absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(0deg,#F4F4F5_0%,rgba(244,244,245,0)_100%)]" />
          <div className="marketing-float absolute bottom-6 right-[8%] z-10 inline-flex items-center gap-2.5 rounded-full border border-white/35 bg-[#0A0B0D]/55 px-3 py-2 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.65)] backdrop-blur-md">
            <LogoMark tone="onDark" className="h-5 w-5 rounded-[6px]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/90">
              BUYBIZ
            </span>
            <span className="h-3 w-px bg-white/25" />
            <span className="text-[8px] font-medium uppercase tracking-[0.1em] text-white/55">
              Proxy access
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-5 pb-7 pt-8 sm:px-8 sm:pb-8 sm:pt-10 lg:pb-8 lg:pt-12">
          <div className="grid min-w-0 items-center gap-8 lg:min-h-[500px] lg:grid-cols-[minmax(0,0.98fr)_minmax(0,1.02fr)]">
            <div className="relative z-10 min-w-0 max-w-full sm:max-w-[620px]">
              <div className="marketing-rise inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-1.5 text-[10px] font-medium text-[#0A0B0D]/55 shadow-[0_8px_20px_-18px_rgba(0,0,0,0.4)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#16794A] shadow-[0_0_0_4px_rgba(22,121,74,0.09)]" />
                Live now: proxy access in naira
              </div>

              <h1 className="marketing-rise marketing-delay-1 mt-5 max-w-full text-[44px] font-semibold leading-[0.92] tracking-[-0.06em] min-[360px]:text-[48px] sm:text-[72px] lg:text-[80px]">
                Proxy access.
                <br />
                <span className="text-[#0A0B0D]/38">Pay in naira.</span>
              </h1>

              <p className="marketing-rise marketing-delay-2 mt-5 max-w-[500px] text-[14px] leading-6 text-[#0A0B0D]/55 sm:mt-6 sm:text-[15px] sm:leading-7">
                Buy shared or personal proxy access in naira, pay from your
                wallet and get your connection details when allocation completes.
                Clear prices, real expiry and no auto-renewal.
              </p>

              <div className="marketing-rise marketing-delay-3 mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0A0B0D] px-5 text-[12px] font-semibold text-white shadow-[0_18px_35px_-24px_rgba(0,0,0,0.8)] transition-colors hover:bg-[#202226] sm:h-12 sm:px-6"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/[0.12] bg-white/60 px-5 text-[12px] font-medium text-[#0A0B0D]/70 backdrop-blur transition-colors hover:bg-white hover:text-[#0A0B0D] sm:h-12 sm:px-6"
                >
                  Explore products
                </Link>
              </div>

              <form
                action="/marketplace"
                method="get"
                role="search"
                className="marketing-rise marketing-delay-4 mt-6 flex h-[52px] w-full max-w-[510px] items-center rounded-full border border-black/[0.09] bg-white p-1.5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.45)] sm:mt-8"
              >
                <Search className="ml-3 h-4 w-4 shrink-0 text-[#0A0B0D]/35" aria-hidden="true" />
                <label htmlFor="site-product-search" className="sr-only">
                  Search proxy plans
                </label>
                <input
                  id="site-product-search"
                  name="q"
                  type="search"
                  placeholder="Search for a proxy plan..."
                  className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[12px] text-[#0A0B0D] outline-none placeholder:text-[#0A0B0D]/35"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-[#0A0B0D] px-5 text-[11px] font-semibold text-white transition-colors hover:bg-[#25272b]"
                >
                  Search
                </button>
              </form>

              <div className="marketing-rise marketing-delay-5 mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#0A0B0D]/45 sm:mt-6">
                <span className="inline-flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Instant allocation
                </span>
                <span className="h-3 w-px bg-black/10" />
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified wallet credit
                </span>
                <span className="h-3 w-px bg-black/10" />
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole className="h-3.5 w-3.5" /> No auto-renewal
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="marketing-light-section relative z-20 -mt-1 bg-[#F4F4F5] pb-7 dark:bg-[#08090B]">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <div className="grid grid-cols-2 overflow-hidden rounded-[18px] border border-black/[0.06] bg-white shadow-[0_30px_70px_-55px_rgba(0,0,0,0.55)] sm:grid-cols-4 sm:divide-x sm:divide-black/[0.06]">
            {trustPoints.map((item) => (
              <div key={item.title} className="marketing-rise flex gap-3 border-b border-black/[0.05] p-4 last:border-b-0 sm:border-b-0 sm:p-5 [&:nth-child(2)]:border-r-0" style={{ animationDelay: `${120 + trustPoints.indexOf(item) * 80}ms` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] text-[#0A0B0D]">
                  <item.icon className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold leading-4">{item.title}</p>
                  <p className="mt-0.5 text-[9px] leading-4 text-[#0A0B0D]/40">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {campaign ? (
        <section className="marketing-light-section bg-white pb-10 pt-3 sm:pb-16 sm:pt-5 dark:bg-[#0B0C0F]">
          <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
            <CampaignCard campaign={campaign} compact />
          </div>
        </section>
      ) : null}

      <section className="marketing-light-section bg-white pb-12 pt-3 sm:pb-20 sm:pt-5 dark:bg-[#0B0C0F]">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C9097]">
                The BUYBIZ catalogue
              </p>
              <h2 className="mt-2 text-[32px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[42px]">
                Popular services
              </h2>
              <p className="mt-2 text-[12px] text-[#6E7178] sm:text-[13px]">
                Start with what is live. Everything else is clearly marked.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-[#0A0B0D] px-4 text-[10.5px] font-semibold text-white transition-colors hover:bg-[#25272b]"
            >
              View all products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="home-stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {popularServices.map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="group relative flex min-h-[154px] flex-col justify-between rounded-[15px] border border-black/[0.07] bg-[#FAFAFB] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-black/[0.16] hover:bg-white hover:shadow-[0_24px_40px_-34px_rgba(0,0,0,0.4)] sm:min-h-[174px] sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-black/[0.06] bg-white text-[#0A0B0D] shadow-xs">
                    <service.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <span className={cn(
                    "rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.08em]",
                    service.live
                      ? "border-[#16794A]/15 bg-[#EAF7F0] text-[#16794A]"
                      : "border-black/[0.06] bg-white text-[#0A0B0D]/35",
                  )}>
                    {service.eyebrow}
                  </span>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold tracking-[-0.02em]">
                      {service.name}
                    </h3>
                    <p className="mt-1 text-[10px] text-[#6E7178]">{service.description}</p>
                  </div>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white text-[#0A0B0D]/55 transition-colors group-hover:border-[#0A0B0D] group-hover:bg-[#0A0B0D] group-hover:text-white">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Why BUYBIZ                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="marketing-light-section bg-[#F4F4F5] pb-12 pt-12 sm:pb-24 sm:pt-24 dark:bg-[#08090B]">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium text-[#8C9097]">
                Why this exists
              </p>
              <h2 className="mt-3 max-w-[460px] text-[30px] font-semibold leading-[1.04] tracking-[-0.045em] text-[#0A0B0D] sm:text-[40px]">
                Clear rules, from the start.
              </h2>
              <p className="mt-4 max-w-[420px] text-[13px] leading-6 text-[#6E7178]">
                One product, done properly: live stock checks, a real expiry
                time and an automatic refund when we cannot deliver.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/about"
                  className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#0A0B0D] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#1a1c1f] sm:h-9 sm:text-[11.5px]"
                >
                  About BUYBIZ <ArrowUpRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex h-11 items-center rounded-full border border-black/10 px-4 text-[12px] font-medium text-[#0A0B0D]/70 transition-colors hover:bg-white sm:h-9 sm:text-[11.5px]"
                >
                  Read the FAQ
                </Link>
              </div>
            </div>

            <div className="home-stagger grid grid-cols-2 gap-3 sm:gap-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-[13px] border border-black/[0.06] bg-white p-3.5 shadow-[0_14px_30px_-28px_rgba(0,0,0,0.25)] sm:rounded-[15px] sm:p-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-black/[0.06] bg-[#F5F5F6] text-[#0A0B0D]">
                    <benefit.icon className="h-4 w-4" strokeWidth={1.7} />
                  </span>
                  <h3 className="mt-3 text-[11.5px] font-semibold leading-4 tracking-[-0.015em] text-[#0A0B0D] sm:mt-4 sm:text-[13px] sm:leading-5">
                    {benefit.title}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-[1.6] text-[#6E7178] sm:text-[11.5px]">
                    {benefit.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="marketing-light-section bg-[#EEEEF0] py-12 sm:py-24 dark:bg-[#0B0C0F]">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <SectionHeading
            eyebrow="How it works"
            title="From wallet to proxy in four steps."
            description="You'll know what is available, what it costs and when it expires before you pay."
            action={
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#0A0B0D]/60 hover:text-[#0A0B0D]"
              >
                Full walkthrough <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />

          <div className="home-stagger mt-7 grid grid-cols-2 gap-2 sm:mt-10 sm:gap-3 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative flex flex-col rounded-[13px] border border-black/[0.055] bg-white p-3.5 sm:rounded-[15px] sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-[#0A0B0D]/30">
                    {step.number}
                  </span>
                  <step.icon className="h-4 w-4 text-[#0A0B0D]/40" strokeWidth={1.6} />
                </div>
                <h3 className="mt-5 text-[12px] font-semibold leading-4 text-[#0A0B0D] sm:mt-8 sm:text-[13.5px] sm:leading-5">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[11.5px] leading-[1.6] text-[#6E7178] sm:mt-2 sm:text-[11.5px] sm:leading-[1.65]">
                  {step.copy}
                </p>
                {index < steps.length - 1 ? (
                  <span className="absolute -right-[13px] top-1/2 hidden h-px w-[26px] bg-black/10 xl:block" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Plans                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="marketing-light-section bg-white py-12 sm:py-24 dark:bg-[#0B0C0F]" id="plans">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <SectionHeading
            eyebrow="Pricing"
            title="Pick how long you need."
            description="Prices are in naira and paid from your wallet. BUYBIZ doesn't add taxes or platform fees at checkout."
            action={
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#0A0B0D]/60 hover:text-[#0A0B0D]"
              >
                Compare plans <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />

          {plansError ? (
            <Alert tone="warning" title="Plans are temporarily unavailable" className="mt-8">
              We could not load live pricing from the database. Please refresh, or
              contact support if this continues.
            </Alert>
          ) : plans.length === 0 ? (
            <Alert tone="info" title="No plans published yet" className="mt-8">
              An administrator has not published any proxy plans. Check back soon.
            </Alert>
          ) : (
            <div className="home-stagger mt-6 grid gap-4 sm:mt-8 sm:gap-5 sm:grid-cols-2 lg:mt-9 lg:grid-cols-2 2xl:grid-cols-4">
              {plans.map((plan) => (
                <div key={plan.product.id}>
                  <PlanCard
                    product={plan.product}
                    availability={plan}
                    featured={plan.product.slug === "proxy-30-days"}
                    ctaLabel="Buy with wallet"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-black/[0.055] bg-[#F7F7F8] px-3.5 py-3 text-[12px] leading-5 text-[#6E7178] sm:mt-4 sm:px-4 sm:text-[10.5px]">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A0B0D]/45" />
            <p>
              Shared plans use the same upstream credentials as other active
              customers. The Personal plan is limited to one customer per proxy.
              If no eligible proxy is available, checkout is disabled and a
              race-condition purchase is refunded automatically.{" "}
              <Link href="/faq" className="underline underline-offset-2">
                Details in the FAQ
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Coming soon                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-[#08090B] py-12 text-white sm:py-24">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-20" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.04] blur-[120px]" />
        <div className="noise" />
        <div className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <SectionHeading
            tone="onDark"
            eyebrow="On the roadmap"
            title="What we are working on next."
            description="These services aren't ready yet. There are no prices, no checkout and no launch dates until the work is done."
            action={
              <Link
                href="/coming-soon"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[11.5px] font-medium text-white/65 transition-colors hover:border-white/25 hover:text-white"
              >
                View roadmap <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />

          <div className="home-stagger mt-9 grid gap-3 lg:grid-cols-2">
            {[
              {
                name: "Virtual phone numbers",
                icon: Phone,
                copy: "Planned for verification and messages. We'll publish coverage and prices only when it works.",
                href: "/coming-soon/phone-numbers",
                visual: "phone",
              },
              {
                name: "PayPal services",
                icon: CreditCard,
                copy: "A future category. BUYBIZ has no PayPal partnership and doesn't offer PayPal services today.",
                href: "/coming-soon/paypal",
                visual: "card",
              },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.href}
                className="group relative min-h-[220px] overflow-hidden rounded-[18px] border border-white/[0.09] bg-white/[0.025] p-5 transition-colors hover:bg-white/[0.045] sm:min-h-[260px] sm:rounded-[20px] sm:p-8"
              >
                <div className="pointer-events-none absolute -right-16 -top-20 h-[260px] w-[260px] rounded-full border border-white/[0.06]" />
                <div className="pointer-events-none absolute -right-6 -top-8 h-[180px] w-[180px] rounded-full border border-white/[0.05]" />
                <div className="relative flex h-full flex-col justify-between gap-10">
                  <div className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.05] text-white/80">
                      <service.icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <Badge tone="onDark" className="border-white/10 bg-white/[0.05] text-white/45">
                      Coming soon
                    </Badge>
                  </div>
                  <div className="max-w-[420px]">
                    <h3 className="text-[19px] font-semibold tracking-[-0.035em] text-white sm:text-[22px]">
                      {service.name}
                    </h3>
                    <p className="mt-2 text-[12px] leading-5 text-white/40">
                      {service.copy}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/60 transition-colors group-hover:text-white">
                      Read the service note
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="marketing-light-section bg-[#F4F4F5] py-12 sm:py-24 dark:bg-[#08090B]">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium text-[#8C9097]">
                Common questions
              </p>
              <h2 className="mt-3 max-w-[400px] text-[30px] font-semibold leading-[1.04] tracking-[-0.045em] text-[#0A0B0D] sm:text-[38px]">
                Before you buy, read this.
              </h2>
              <p className="mt-4 max-w-[360px] text-[12.5px] leading-6 text-[#6E7178]">
                The things people ask about most: shared access, refunds and
                expiry.
              </p>
              <Link
                href="/faq"
                className="mt-6 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#0A0B0D] hover:underline"
              >
                Read the complete FAQ <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="home-stagger divide-y divide-black/[0.07] border-y border-black/[0.07]">
              {faqs.map((faq) => (
                <details key={faq.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[13px] font-medium text-[#0A0B0D] [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#0A0B0D]/35 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2.5 max-w-[620px] pr-8 text-[11.5px] leading-[1.7] text-[#6E7178]">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Support CTA                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-white pb-12 pt-2 dark:bg-[#08090B] sm:pb-24 sm:pt-4">
        <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[20px] bg-[#0A0B0D] px-5 py-8 text-white sm:rounded-[24px] sm:px-10 sm:py-14">
            <div className="pointer-events-none absolute inset-0 grid-lines opacity-25" />
            <div className="pointer-events-none absolute -right-20 -top-32 h-[360px] w-[360px] rounded-full bg-white/[0.08] blur-[90px]" />
            <div className="noise" />
            <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div className="max-w-[560px]">
                <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.06]">
                  <LifeBuoy className="h-[18px] w-[18px] text-white/75" strokeWidth={1.6} />
                </span>
                <h2 className="mt-6 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[36px]">
                  Not sure which plan to pick?
                </h2>
                <p className="mt-3 max-w-[460px] text-[12.5px] leading-6 text-white/45">
                  Ask about stock, shared access, expiry or refunds. Every reply
                  stays attached to your account in the dashboard.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                <Link
                  href="/contact"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-5 text-[12px] font-semibold text-[#0A0B0D] transition-colors hover:bg-white/90"
                >
                  Contact support
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-5 text-[12px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  Browse FAQ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
