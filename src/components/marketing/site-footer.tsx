import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const columns = [
  {
    title: "Products",
    links: [
      { href: "/marketplace", label: "Proxy marketplace" },
      { href: "/pricing", label: "Pricing" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/coming-soon", label: "Coming soon" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About BUYBIZ" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy notice" },
      { href: "/terms#wallet", label: "Wallet policy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-[#08090B] text-white">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_2fr]">
          <div className="max-w-md">
            <Logo tone="onDark" size="md" />
            <p className="mt-5 text-[13px] leading-6 text-white/45">
              A Nigeria-focused digital marketplace. Start with wallet-funded
              proxy access, with more digital services planned and clearly
              labelled before they launch.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-medium text-white/55">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6EE7A8]" />
                Live: proxy access
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-medium text-white/35">
                Planned: virtual numbers
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10.5px] font-medium text-white/35">
                Planned: PayPal services
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="text-[11px] font-semibold text-white/50">
                  {column.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-1 text-[13px] text-white/55 transition-colors hover:text-white"
                      >
                        {link.label}
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-[14px] border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
          <p className="text-[11.5px] leading-5 text-white/40">
            <span className="font-medium text-white/55">Please note:</span>{" "}
            Wallet credit is for purchases on BUYBIZ only and cannot be withdrawn
            as cash. Shared proxy access may be used by other active customers. Full
            details are in the{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-white/65">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/faq" className="underline underline-offset-2 hover:text-white/65">
              FAQ
            </Link>
            . Terms and Privacy are drafts pending legal review.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[10.5px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} BUYBIZ. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/terms" className="hover:text-white/60">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-white/60">
              Privacy
            </Link>
            <span>Built for Nigeria · Prices in NGN</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
