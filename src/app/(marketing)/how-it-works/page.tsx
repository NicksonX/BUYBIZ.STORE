import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock3,
  CreditCard,
  Layers3,
  LockKeyhole,
  Network,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { MarketingPageHero, HeroLink } from "@/components/marketing/page-hero";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "How it works",
  description:
    "How BUYBIZ wallet funding, proxy allocation, shared access, expiry and automatic wallet refunds work.",
};

const steps = [
  {
    number: "01",
    title: "Create an account",
    copy: "Choose a unique username, add your email and verify it. Email verification is required before buying or depositing.",
    icon: BadgeCheck,
  },
  {
    number: "02",
    title: "Fund your wallet",
    copy: "Start a deposit, pay through the configured payment method, and receive a wallet credit only after server-side verification.",
    icon: Wallet,
  },
  {
    number: "03",
    title: "Choose a proxy plan",
    copy: "We check live seat capacity, inventory status and remaining upstream lifetime inside the purchase transaction.",
    icon: Network,
  },
  {
    number: "04",
    title: "Use your access window",
    copy: "Your own expiry and shared connection details appear in My Proxies. When the window ends, credentials are hidden.",
    icon: LockKeyhole,
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="How it works"
        title={
          <>
            How BUYBIZ
            <br />
            <span className="text-silver">works.</span>
          </>
        }
        description="Here's what happens from the moment you sign up to the moment your proxy details appear."
        actions={
          <>
            <HeroLink href="/marketplace">Choose a plan</HeroLink>
            <HeroLink href="/faq" secondary>
              Read the FAQ
            </HeroLink>
          </>
        }
        aside={
          <div className="w-full max-w-[280px] rounded-[16px] border border-white/10 bg-white/[0.035] p-4">
            <p className="text-[9px] uppercase tracking-[0.14em] text-white/35">
              The short version
            </p>
            <ol className="mt-3 space-y-2.5 text-[10.5px] text-white/50">
              <li className="flex gap-2">
                <span className="font-mono text-white/25">01</span> Verify your
                account
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-white/25">02</span> Fund your NGN
                wallet
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-white/25">03</span> Buy an
                eligible plan
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-white/25">04</span> Copy your
                shared credentials
              </li>
            </ol>
          </div>
        }
      />

      <section className="bg-[#F4F4F5] py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative rounded-[15px] border border-black/[0.055] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#0A0B0D]/30">
                    {step.number}
                  </span>
                  <step.icon className="h-4 w-4 text-[#0A0B0D]/40" />
                </div>
                <h2 className="mt-8 text-[13.5px] font-semibold text-[#0A0B0D]">
                  {step.title}
                </h2>
                <p className="mt-2 text-[11px] leading-[1.65] text-[#6E7178]">
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

      <section id="wallet" className="scroll-mt-24 bg-white py-14 sm:py-20">
        <div className="mx-auto grid w-full max-w-[1100px] gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="text-[11px] font-medium text-[#8C9097]">
              01 · Wallet
            </p>
            <h2 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0A0B0D] sm:text-[34px]">
              Your wallet does the paying.
            </h2>
            <p className="mt-3 text-[12.5px] leading-6 text-[#6E7178]">
              BUYBIZ uses an internal wallet priced in naira. You start a deposit,
              pay through the configured payment provider, and your wallet is
              credited only after the payment is verified on the server. A
              duplicate callback or webhook cannot credit you twice.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Wallet credit is for BUYBIZ purchases only.",
                "There is no withdrawal or cash-out feature in this release.",
                "Every balance change is an append-only ledger entry.",
                "A deposit is a liability, not revenue; BUYBIZ records it that way.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-[11px] leading-5 text-[#6E7178]"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0A0B0D]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-[20px] border border-black/[0.06] bg-[#0A0B0D] p-5 text-white shadow-[0_40px_80px_-50px_rgba(0,0,0,0.7)] sm:p-6">
            <div className="pointer-events-none absolute inset-0 grid-lines opacity-20" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.06]">
                    <Wallet className="h-3.5 w-3.5 text-white/60" />
                  </span>
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                      Wallet ledger
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/25">
                      Illustration only. Not real account data.
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] text-white/40">
                  NGN
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Deposit verified", amount: "+₦25,000.00", positive: true },
                  { label: "24-hour proxy", amount: "−₦500.00", positive: false },
                  { label: "No-stock refund", amount: "+₦1,000.00", positive: true },
                  { label: "7-day proxy", amount: "−₦1,000.00", positive: false },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between border-b border-white/[0.07] pb-2.5 text-[10px]"
                  >
                    <span className="flex items-center gap-2 text-white/45">
                      <ReceiptText className="h-3 w-3" /> {row.label}
                    </span>
                    <span
                      className={
                        row.positive ? "text-[#8EE7B8]" : "text-white/70"
                      }
                    >
                      {row.amount}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[9px] text-white/30">Balance</span>
                <span className="tabular text-[15px] font-semibold">
                  ₦24,500.00
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capacity" className="scroll-mt-24 bg-[#F4F4F5] py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium text-[#8C9097]">
                02 · Allocation
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0A0B0D] sm:text-[34px]">
                Why shared proxies have a limit.
              </h2>
              <p className="mt-3 text-[12.5px] leading-6 text-[#6E7178]">
                Each shared upstream proxy can serve a limited number of active BUYBIZ
                allocations. Seat counts come from live allocation records, not a
                counter that can drift.
              </p>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  icon: LockKeyhole,
                  title: "Wallet and inventory are locked",
                  copy: "The purchase locks your wallet account and candidate inventory rows, then re-checks balance and capacity inside the same transaction.",
                },
                {
                  icon: Users,
                  title: "Seat counting is live",
                  copy: "Only allocations with status active and an expiry in the future count toward the proxy's active limit. A database trigger also blocks over-allocation.",
                },
                {
                  icon: Clock3,
                  title: "Upstream lifetime is a guard",
                  copy: "A plan is only sold when the upstream proxy remains valid for the full customer package plus a safety buffer.",
                },
                {
                  icon: RefreshCw,
                  title: "Concurrency has a real answer",
                  copy: "Simultaneous buyers cannot both take the last seat. The second buyer is moved to another eligible proxy or receives an honest no-stock outcome.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-[13px] border border-black/[0.055] bg-white p-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-black/[0.06] bg-[#F6F6F7]">
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-[11.5px] font-semibold text-[#0A0B0D]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[10px] leading-[1.65] text-[#6E7178]">
                      {item.copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="shared" className="scroll-mt-24 bg-white py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium text-[#8C9097]">
                03 · Shared access
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0A0B0D] sm:text-[34px]">
                What shared access means in practice.
              </h2>
              <p className="mt-3 text-[12.5px] leading-6 text-[#6E7178]">
                Other active customers may receive the same upstream host,
                port, username, password and outgoing IP. BUYBIZ does not create
                fake per-customer credentials.
              </p>
              <div className="mt-5 rounded-[12px] border border-[#946200]/20 bg-[#FDF4E3] p-4">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#946200]">
                  <ShieldCheck className="h-3.5 w-3.5" /> Important limitation
                </p>
                <p className="mt-1.5 text-[10px] leading-5 text-[#946200]/80">
                  BUYBIZ can end your entitlement in its database and hide the
                  connection details when your package expires. It cannot
                  technically revoke only your access to a shared upstream
                  credential at network level without affecting other customers.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: Users,
                  title: "Shared with other customers",
                  copy: "The active customer limit per upstream proxy is configurable and enforced by live seat records.",
                },
                {
                  icon: Network,
                  title: "Same upstream identity",
                  copy: "Customers may share the same outgoing IP. We do not advertise a dedicated IP.",
                },
                {
                  icon: Clock3,
                  title: "Separate BUYBIZ clocks",
                  copy: "Each customer's entitlement has its own expiry. One customer ending does not change another's record.",
                },
                {
                  icon: ShieldCheck,
                  title: "No false revocation claims",
                  copy: "We describe the technical limitation plainly rather than claiming a network-level block we cannot provide.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[13px] border border-black/[0.055] bg-[#F9F9FA] p-4"
                >
                  <item.icon className="h-4 w-4 text-[#0A0B0D]/45" />
                  <h3 className="mt-4 text-[11.5px] font-semibold text-[#0A0B0D]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[10px] leading-[1.65] text-[#6E7178]">
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="refunds" className="scroll-mt-24 bg-[#F4F4F5] py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium text-[#8C9097]">
                04 · Refunds
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0A0B0D] sm:text-[34px]">
                If we can't deliver, you get your money back.
              </h2>
            </div>
            <div>
              <div className="rounded-[16px] border border-black/[0.06] bg-white p-5">
                <h3 className="text-[12px] font-semibold text-[#0A0B0D]">
                  No eligible proxy at purchase time
                </h3>
                <p className="mt-1.5 text-[10.5px] leading-5 text-[#6E7178]">
                  If your balance is sufficient but no eligible proxy exists, the
                  system creates an order with a clear no-stock reason and writes
                  a refund credit linked to that order. The net effect is zero and
                  nothing is left charged.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    ["Order", "Recorded"],
                    ["Wallet debit", "Recorded"],
                    ["Wallet refund", "Linked + idempotent"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[9px] border border-black/[0.055] bg-[#F7F7F8] px-3 py-2.5"
                    >
                      <p className="text-[8.5px] uppercase tracking-[0.1em] text-[#8C9097]">
                        {label}
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-[#0A0B0D]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-[14px] border border-black/[0.06] bg-white p-5">
                <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0A0B0D]">
                  <CreditCard className="h-3.5 w-3.5" /> Refund method
                </h3>
                <p className="mt-1.5 text-[10.5px] leading-5 text-[#6E7178]">
                  Refunds are credits to your internal BUYBIZ wallet only. They
                  are not cash transfers to your bank. Multiple retries or
                  duplicate callbacks cannot create a second refund.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="expiry" className="scroll-mt-24 bg-white py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="text-[11px] font-medium text-[#8C9097]">
                05 · Expiry
              </p>
              <h2 className="mt-3 text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#0A0B0D] sm:text-[34px]">
                Two expiry dates that matter.
              </h2>
              <p className="mt-3 text-[12.5px] leading-6 text-[#6E7178]">
                Upstream inventory has its own expiry. Your customer package has
                its own clock. A customer's expiry never pauses or ends another
                customer's allocation.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-black/[0.06] bg-[#F9F9FA] p-5">
                <Clock3 className="h-4 w-4 text-[#0A0B0D]/45" />
                <h3 className="mt-4 text-[12px] font-semibold text-[#0A0B0D]">
                  Customer clock
                </h3>
                <p className="mt-1.5 text-[10px] leading-5 text-[#6E7178]">
                  24 hours means exactly 24 hours from successful allocation.
                  Seven days and 30 days are exact 24-hour multiples. There is
                  no auto-renewal.
                </p>
              </div>
              <div className="rounded-[14px] border border-black/[0.06] bg-[#F9F9FA] p-5">
                <Layers3 className="h-4 w-4 text-[#0A0B0D]/45" />
                <h3 className="mt-4 text-[12px] font-semibold text-[#0A0B0D]">
                  Inventory clock
                </h3>
                <p className="mt-1.5 text-[10px] leading-5 text-[#6E7178]">
                  Each upstream proxy has an expiry recorded by the admin. If it
                  expires, active allocations on that inventory are marked
                  interrupted and customers are notified. New sales stop.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-[18px] bg-[#0A0B0D] p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-[18px] font-semibold tracking-[-0.03em]">
                Ready to try it?
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                Create an account, add money and pick a plan.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/register"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[11px] font-semibold text-[#0A0B0D]"
              >
                Create account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-9 items-center gap-1 rounded-full border border-white/15 px-4 text-[11px] text-white/70 hover:bg-white/[0.06]"
              >
                Pricing <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
