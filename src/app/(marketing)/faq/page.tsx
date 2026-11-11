import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, LifeBuoy } from "lucide-react";
import { MarketingPageHero, HeroLink } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about BUYBIZ proxy plans, shared access, wallet deposits, refunds, expiry, coming-soon services and account security.",
};

const groups = [
  {
    title: "Buying & availability",
    items: [
      {
        q: "What can I buy on BUYBIZ today?",
        a: "Only proxy access. There are four fixed plans: 24 hours for ₦500, 7 days for ₦1,000, 30 days for ₦3,000, and a Personal 30-day proxy for ₦5,000 with one customer per proxy. Virtual phone numbers and PayPal-related services are planned and marked Coming Soon; they cannot be purchased.",
      },
      {
        q: "Why is a plan sometimes unavailable?",
        a: "BUYBIZ only sells a plan when at least one upstream proxy has a free seat and enough remaining upstream lifetime for the full customer package plus a safety buffer. When no inventory qualifies, the purchase button is disabled. A race-condition purchase is recorded and refunded to your wallet automatically.",
      },
      {
        q: "What does “shared proxy” mean?",
        a: "Shared plans use the same upstream host, port, username and password as other active customers. They may also share the same outgoing IP. BUYBIZ does not claim a dedicated IP and does not fabricate separate credentials when the provider supplies only one. The Personal 30-Day Proxy is limited to one customer per proxy.",
      },
      {
        q: "Is there a maximum number of customers per proxy?",
        a: "Yes. Shared plans are capped by BUYBIZ to protect quality. Seat counts are based on live allocation records with a future expiry, not on a manually editable counter. The Personal 30-Day Proxy is limited to one customer per proxy.",
      },
      {
        q: "Can I buy multiple plans?",
        a: "Yes, while each purchase is separately checked for balance, available seats and upstream lifetime. Each purchase creates its own order and allocation with its own expiry. Only one Personal 30-Day Proxy can be active per customer at a time.",
      },
    ],
  },
  {
    title: "Wallet & payments",
    items: [
      {
        q: "How do I add money to my BUYBIZ wallet?",
        a: "Start a deposit from the Wallet page and pay through the configured payment method. Your wallet is credited only after BUYBIZ verifies the payment on the server. A browser redirect alone never credits your wallet.",
      },
      {
        q: "Can I withdraw my BUYBIZ balance?",
        a: "No. BUYBIZ wallet credit is an internal purchasing balance for BUYBIZ services and is not cash-withdrawable in the initial release. There is no withdrawal or transfer-out feature.",
      },
      {
        q: "Are deposit fees added by BUYBIZ?",
        a: "BUYBIZ does not add its own fee or tax to the amount you enter. The payment provider may apply its own processing fees according to its terms and your payment method. BUYBIZ displays the amount you are crediting.",
      },
      {
        q: "How do referrals work?",
        a: "Every customer has a referral code on Dashboard > Refer and earn. You earn ₦1,000 in BUYBIZ wallet credit after a new customer makes one verified external deposit of at least ₦3,000. Internal transfers, refunds, admin credits and adjustments do not count. There is one reward per referred customer, self-referrals and duplicate-account abuse are rejected, and the reward is internal wallet credit, not cash.",
      },
      {
        q: "What happens if a payment webhook is duplicated?",
        a: "Webhook events and wallet credits are idempotent. A duplicate callback or webhook cannot create a second ledger credit. The server verifies status, amount, currency and reference before crediting.",
      },
      {
        q: "Can I be charged without receiving a proxy?",
        a: "No. A completed purchase either creates an allocation or creates a clearly recorded no-stock refund with a matching wallet credit. You are never left with a debit that has no order, allocation or refund trail.",
      },
    ],
  },
  {
    title: "Access, expiry & refunds",
    items: [
      {
        q: "When does my proxy access start and end?",
        a: "It starts at successful allocation, not when you create your account or fund your wallet. A 24-hour package expires exactly 24 hours later; 7-day and 30-day packages expire at exact 24-hour multiples.",
      },
      {
        q: "Does my access renew automatically?",
        a: "No automatic renewal. While an active proxy still has remaining time, the proxy page shows a manual renewal option. A renewal debits your wallet, adds the same access window from your current expiry, and is only allowed when the upstream has enough remaining lifetime. Once the window ends, buy a new plan instead.",
      },
      {
        q: "Can BUYBIZ revoke only my access to a shared proxy?",
        a: "BUYBIZ can end your entitlement in its own database and hide your connection details. Because the upstream credentials are shared, it cannot technically revoke only your network access without affecting other customers. We state this limitation plainly instead of claiming a capability we do not have.",
      },
      {
        q: "What happens if the upstream proxy expires early?",
        a: "New allocations on that inventory stop, affected active allocations are marked interrupted, and customers are notified in-app. Any wallet remedy is handled according to the configured policy and, where needed, manual support review. BUYBIZ does not silently present an expired upstream as active.",
      },
      {
        q: "How do refunds work?",
        a: "Automatic no-stock refunds are credited to your internal BUYBIZ wallet and linked to the original order. They are not cash withdrawals. Admin adjustments are recorded as new immutable ledger entries with a reason and audit event.",
      },
    ],
  },
  {
    title: "Account, support & upcoming services",
    items: [
      {
        q: "Why do I need to verify my email?",
        a: "Email verification is required before making purchases or deposits. It protects your account and ensures support and order communication reach the right person.",
      },
      {
        q: "How do I contact support?",
        a: "Signed-in customers can open a ticket from the dashboard. The public Contact page also stores a message for the BUYBIZ support team. Do not send passwords, card numbers or API keys.",
      },
      {
        q: "When will virtual phone numbers launch?",
        a: "No launch date is promised. The service is planned and will be published with real scope, coverage and pricing only when it is operational. There is no waitlist or fake checkout in this release.",
      },
      {
        q: "Is BUYBIZ offering PayPal services?",
        a: "No. PayPal-related services are a planned future category. BUYBIZ does not claim a PayPal partnership and does not currently offer PayPal account or payment services.",
      },
      {
        q: "How is my data protected?",
        a: "Authentication is handled by Supabase, wallet and order records require an authenticated session, and every privileged operation is checked on the server. Proxy credentials are encrypted at rest and decrypted only for the owning customer while their access is active. Full details are in the Privacy Notice.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Frequently asked questions"
        title={
          <>
            Before you
            <br />
            <span className="text-silver">buy anything.</span>
          </>
        }
        description="The answers below cover stock, shared access, refunds and expiry. If something is still unclear, send us a message."
        actions={
          <>
            <HeroLink href="/contact">Contact support</HeroLink>
            <HeroLink href="/how-it-works" secondary>
              Full walkthrough
            </HeroLink>
          </>
        }
        compact
      />

      <section className="bg-[#F4F4F5] py-12 sm:py-16">
        <div className="mx-auto w-full max-w-[1000px] px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-14">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8C9097]">
                On this page
              </p>
              <ul className="mt-3 space-y-2">
                {groups.map((group, index) => (
                  <li key={group.title}>
                    <a
                      href={`#faq-${index}`}
                      className="text-[10.5px] text-[#6E7178] hover:text-[#0A0B0D]"
                    >
                      {group.title}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-[12px] border border-black/[0.06] bg-white p-3.5">
                <p className="text-[10px] font-medium text-[#0A0B0D]">
                  Still stuck?
                </p>
                <p className="mt-1 text-[9px] leading-4 text-[#6E7178]">
                  Send a message or open a ticket from your dashboard.
                </p>
                <Link
                  href="/contact"
                  className="mt-2.5 inline-flex items-center gap-1 text-[9.5px] font-medium text-[#0A0B0D] hover:underline"
                >
                  Contact BUYBIZ <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </aside>

            <div className="space-y-8">
              {groups.map((group, index) => (
                <div key={group.title} id={`faq-${index}`} className="scroll-mt-24">
                  <h2 className="text-[18px] font-semibold tracking-[-0.025em] text-[#0A0B0D]">
                    {group.title}
                  </h2>
                  <div className="mt-2 divide-y divide-black/[0.07] border-y border-black/[0.07]">
                    {group.items.map((item) => (
                      <details key={item.q} className="group py-4">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[12px] font-medium text-[#0A0B0D] [&::-webkit-details-marker]:hidden">
                          {item.q}
                          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[#0A0B0D]/30 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 max-w-[620px] pr-8 text-[11px] leading-[1.75] text-[#6E7178]">
                          {item.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-col items-start justify-between gap-4 rounded-[16px] bg-[#0A0B0D] p-6 text-white sm:flex-row sm:items-center">
                <div>
                  <p className="flex items-center gap-2 text-[15px] font-semibold">
                    <LifeBuoy className="h-4 w-4 text-white/50" /> Need a
                    different answer?
                  </p>
                  <p className="mt-1 text-[10.5px] text-white/40">
                    Ask before you buy. We would rather clarify than surprise you.
                  </p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[10.5px] font-semibold text-[#0A0B0D]"
                >
                  Contact <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
