import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { MarketingPageHero } from "@/components/marketing/page-hero";
import { ContactForm } from "@/components/marketing/contact-form";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact BUYBIZ about proxy access, the wallet, deposits, refunds or planned services. No public support email or phone number has been invented.",
};

export default function ContactPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Contact"
        title={
          <>
            Send us
            <br />
            <span className="text-silver">a message.</span>
          </>
        }
        description="Questions about a plan, a payment or your access? Send a message here. If you're signed in, a support ticket keeps everything attached to your account."
        compact
      />

      <section className="bg-[#F4F4F5] py-12 sm:py-16">
        <div className="mx-auto grid w-full max-w-[1000px] gap-4 px-5 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[16px] border border-black/[0.06] bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/[0.06] bg-[#F6F6F7]">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-[15px] font-semibold text-[#0A0B0D]">
                  Send a message
                </h1>
                <p className="text-[9.5px] text-[#6E7178]">
                  Messages are stored for the BUYBIZ support team.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <ContactForm />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[14px] border border-black/[0.06] bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A0B0D]">
                <Mail className="h-3.5 w-3.5" /> Official channels
              </h2>
              <p className="mt-2 text-[10px] leading-5 text-[#6E7178]">
                BUYBIZ has not published a support email address or phone number
                yet. We are not inventing one. Use this form for general
                enquiries, or the dashboard inbox for account-specific support.
              </p>
              <Link
                href="/dashboard/support"
                className="mt-3 inline-flex items-center gap-1 text-[9.5px] font-medium text-[#0A0B0D] hover:underline"
              >
                Dashboard support <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="rounded-[14px] border border-black/[0.06] bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A0B0D]">
                <Clock3 className="h-3.5 w-3.5" /> What to include
              </h2>
              <ul className="mt-2 space-y-1.5 text-[9.5px] leading-4 text-[#6E7178]">
                <li>· Order number (BZ-…) if relevant</li>
                <li>· The exact error or question</li>
                <li>· Whether your proxy shows as active</li>
                <li>· Deposit reference, if about a payment</li>
              </ul>
            </div>

            <div className="rounded-[14px] border border-[#946200]/20 bg-[#FDF4E3] p-4">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#946200]">
                <LockKeyhole className="h-3.5 w-3.5" /> Keep secrets out
              </h2>
              <p className="mt-2 text-[9.5px] leading-4 text-[#946200]/80">
                Never send your password, full card number, Paystack secret key or
                email recovery codes. BUYBIZ support does not need them.
              </p>
            </div>

            <div className="rounded-[14px] border border-black/[0.06] bg-white p-4">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0A0B0D]">
                <ShieldCheck className="h-3.5 w-3.5" /> Already a customer?
              </h2>
              <p className="mt-2 text-[9.5px] leading-4 text-[#6E7178]">
                Tickets keep the conversation attached to your orders, wallet and
                proxy records, which makes support faster.
              </p>
              <Link
                href="/login?next=/dashboard/support/new"
                className="mt-3 inline-flex h-8 items-center gap-1 rounded-full bg-[#0A0B0D] px-3 text-[9.5px] font-medium text-white"
              >
                <LifeBuoy className="h-3 w-3" /> Sign in & open a ticket
              </Link>
            </div>

            <div className="flex items-start gap-1.5 rounded-[10px] px-1 text-[8.5px] leading-4 text-[#6E7178]">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
              Do not use contact forms to request illegal services or attempts to
              bypass platform verification.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
