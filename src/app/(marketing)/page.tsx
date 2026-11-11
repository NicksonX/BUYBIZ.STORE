import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Layers3,
  LifeBuoy,
  LockKeyhole,
  Network,
  Phone,
  ReceiptText,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { HeroArt } from "@/components/marketing/hero-art";
import { PlanCard } from "@/components/marketplace/plan-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { PlanAvailability } from "@/lib/db/types";
import { getPlanAvailability } from "@/server/data/products";

export const dynamic = "force-dynamic";

const services = [
  {
    name: "Proxies",
    description:
      "Shared proxy access for 24 hours, 7 days or 30 days. Pay from your wallet.",
    icon: Network,
    live: true,
    href: "/marketplace",
    action: "See proxy plans",
  },
  {
    name: "Virtual phone numbers",
    description:
      "Planned for verification and messages. Not available to buy yet.",
    icon: Phone,
    live: false,
    href: "/coming-soon/phone-numbers",
    action: "See what's planned",
  },
  {
    name: "PayPal services",
    description:
      "A future service category. BUYBIZ is not offering PayPal services today.",
    icon: CreditCard,
    live: false,
    href: "/coming-soon/paypal",
    action: "See what's planned",
  },
  {
    name: "More digital services",
    description:
      "New categories will be announced only when they are actually ready.",
    icon: Layers3,
    live: false,
    href: "/coming-soon",
    action: "View roadmap",
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
    copy: "Up to 10 customers may share the same upstream credentials and IP. We don't call it a dedicated IP.",
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
    copy: "Pick 24 hours, 7 days or 30 days. We check stock and the proxy's remaining life before charging.",
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
    a: "You receive a period of authorized access to a shared upstream proxy that BUYBIZ has added to its inventory. Up to 10 active customers may use the same upstream credentials and outgoing IP. This is not a dedicated IP product.",
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
  let plans: PlanAvailability[] = [];
  let plansError = false;
  try {
    plans = await getPlanAvailability();
  } catch (error) {
    console.error("[buybiz/home] product availability unavailable", error);
    plansError = true;
  }

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-[#08090B] text-white">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-30" />
        <div className="pointer-events-none absolute -left-40 top-0 hidden h-[540px] w-[540px] rounded-full bg-white/[0.045] blur-[120px] sm:block" />
        <div className="pointer-events-none absolute -right-20 bottom-0 hidden h-[420px] w-[420px] rounded-full bg-white/[0.05] blur-[100px] sm:block" />
        <div className="noise" />

        <div className="relative mx-auto w-full max-w-[1200px] px-5 pb-20 pt-8 sm:px-8 sm:pb-36 sm:pt-16 lg:pb-40">
          <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-2">
            <div className="relative z-10 max-w-[650px] animate-rise">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[10px] font-medium tracking-[0.02em] text-white/55">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7BE3AC] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7BE3AC]" />
                </span>
                Live now: 24-hour, 7-day and 30-day plans.
              </div>

              <h1 className="mt-5 text-[32px] font-semibold leading-[0.98] tracking-[-0.055em] min-[360px]:text-[38px] sm:text-[55px] lg:text-[60px] xl:text-[66px]">
                <span className="block">Buy proxy access.</span>
                <span className="block text-silver">Pay in naira.</span>
              </h1>

              <p className="mt-5 max-w-[470px] text-[14px] leading-6 text-white/55 sm:mt-6 sm:text-[15px] sm:leading-7">
                Top up your wallet, pick a plan and get your connection details
                straight away. No dollar card. No sales chat. If no proxy is
                free, the money goes back to your wallet.
              </p>

              <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="/marketplace"
                  className={cn(
                    buttonVariants({ variant: "inverse", size: "lg" }),
                    "h-11 w-full rounded-full px-5 text-[12.5px] font-semibold shadow-[0_16px_40px_-20px_rgba(255,255,255,0.5)] sm:w-auto",
                  )}
                >
                  Choose a plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-5 text-[12.5px] font-medium text-white/75 transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white sm:w-auto"
                >
                  See how it works
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-white/55">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pay from your wallet
                </span>
                <span className="hidden h-3 w-px bg-white/10 sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  No auto-renewal
                </span>
                <span className="hidden h-3 w-px bg-white/10 sm:block" />
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Expiry shown before you pay
                </span>
              </div>

              <div className="mt-8 grid max-w-[560px] grid-cols-3 gap-3 border-t border-white/[0.09] pt-5 sm:mt-10 sm:gap-6 sm:pt-6">
                {[
                  {
                    icon: Wallet,
                    value: "Pay in naira",
                    label: "Top up once, then buy",
                  },
                  {
                    icon: ReceiptText,
                    value: "Fixed prices",
                    label: "No surprise fees",
                  },
                  {
                    icon: Users,
                    value: "Shared access",
                    label: "Up to 10 per proxy",
                  },
                ].map((item) => (
                  <div key={item.value} className="min-w-0">
                    <item.icon className="h-4 w-4 text-white/45" strokeWidth={1.6} />
                    <p className="mt-2 text-[12.5px] font-semibold tracking-[-0.02em] text-white sm:mt-2.5 sm:text-[13px]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-white/50 sm:text-[10px]">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative -mx-3 hidden lg:-mr-10 lg:block xl:-mr-16">
              <HeroArt />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Services panel                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-[#F4F4F5]">
        <div className="mx-auto -mt-14 w-full max-w-[1200px] px-4 sm:-mt-24 sm:px-8">
          <div className="relative overflow-hidden rounded-[22px] border border-black/[0.055] bg-white p-4 shadow-[0_50px_100px_-60px_rgba(0,0,0,0.55)] sm:rounded-[26px] sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-medium text-[#8C9097]">
                  What we sell
                </p>
                <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#0A0B0D] sm:text-[28px]">
                  What is live, and what is coming.
                </h2>
              </div>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#0A0B0D]/55 transition-colors hover:text-[#0A0B0D]"
              >
                Browse the marketplace <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 xl:grid-cols-4">
              {services.map((service) => {
                const roadmap = service.name === "More digital services";
                return (
                <Link
                  key={service.name}
                  href={service.href}
                  className={cn(
                    "group relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[13px] border p-4 transition-all duration-300 sm:min-h-[170px] sm:rounded-[15px] sm:p-5 xl:min-h-[196px]",
                    service.live
                      ? "col-span-2 border-[#0A0B0D]/15 bg-[#FBFBFC] shadow-[0_16px_30px_-24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:border-[#0A0B0D]/30 sm:col-span-1"
                      : roadmap
                        ? "col-span-2 border-black/[0.05] bg-[#F6F6F7] hover:-translate-y-0.5 hover:border-black/10 hover:bg-[#F1F1F3] sm:col-span-1"
                        : "border-black/[0.05] bg-[#F6F6F7] hover:-translate-y-0.5 hover:border-black/10 hover:bg-[#F1F1F3]",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-[9px] border sm:h-10 sm:w-10 sm:rounded-[11px]",
                          service.live
                            ? "border-transparent bg-[#0A0B0D] text-white"
                            : "border-black/[0.06] bg-white text-[#0A0B0D]/65",
                        )}
                      >
                        <service.icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={1.7} />
                      </span>
                      <Badge
                        tone={service.live ? "solid" : "neutral"}
                        className={cn(
                          "px-1.5 py-0.5 text-[8px] sm:px-2 sm:text-[9.5px]",
                          service.live
                            ? "bg-[#0A0B0D] text-white"
                            : "border-black/[0.06] bg-white/70 text-[#6E7178]",
                        )}
                      >
                        {service.live ? "Live now" : "Coming soon"}
                      </Badge>
                    </div>
                    <h3 className="mt-4 text-[12px] font-semibold tracking-[-0.02em] text-[#0A0B0D] sm:mt-5 sm:text-[14px]">
                      {service.name}
                    </h3>
                    <p className="mt-1.5 text-[12px] leading-[1.6] text-[#6E7178]">
                      {service.description}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-[9.5px] font-medium text-[#0A0B0D]/50 transition-colors group-hover:text-[#0A0B0D] sm:mt-4 sm:text-[10.5px]">
                    {service.action}
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Why BUYBIZ                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="bg-[#F4F4F5] pb-12 pt-12 sm:pb-24 sm:pt-24">
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

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
      <section className="bg-[#EEEEF0] py-12 sm:py-24">
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

          <div className="mt-7 grid grid-cols-2 gap-2 sm:mt-10 sm:gap-3 xl:grid-cols-4">
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
      <section className="bg-white py-12 sm:py-24" id="plans">
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
            <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 md:grid-cols-3 lg:mt-9">
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
              Plans are shared: up to 10 active customers may use the same
              credentials and IP. If no eligible proxy is available, checkout is
              disabled. A race-condition purchase is refunded automatically.{" "}
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

          <div className="mt-9 grid gap-3 lg:grid-cols-2">
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
      <section className="bg-[#F4F4F5] py-12 sm:py-24">
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

            <div className="divide-y divide-black/[0.07] border-y border-black/[0.07]">
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
      <section className="bg-white pb-12 pt-2 sm:pb-24 sm:pt-4">
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
    </>
  );
}
