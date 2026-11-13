"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, LayoutDashboard, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const productLinks = [
  {
    href: "/marketplace",
    label: "Proxy marketplace",
    description: "24-hour, 7-day and 30-day access",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "The exact launch prices",
  },
  {
    href: "/how-it-works",
    label: "How it works",
    description: "Wallet, allocation and expiry",
  },
];

const solutionLinks = [
  {
    href: "/how-it-works#wallet",
    label: "Wallet-first checkout",
    description: "Fund once, buy instantly",
  },
  {
    href: "/how-it-works#shared",
    label: "Shared proxies, explained",
    description: "Shared upstream access",
  },
  {
    href: "/how-it-works#refunds",
    label: "Availability safeguards",
    description: "Automatic wallet refunds",
  },
];

const resourceLinks = [
  { href: "/faq", label: "FAQ", description: "Straight answers" },
  { href: "/about", label: "About BUYBIZ", description: "What we are building" },
  { href: "/contact", label: "Contact", description: "Talk to support" },
];

export function SiteHeader({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header className="safe-top sticky top-0 z-50 border-b border-white/[0.07] bg-[#08090B] text-white lg:bg-[#08090B]/88 lg:backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] w-full max-w-[1200px] items-center justify-between gap-6 px-5 sm:px-8">
        <Link
          href="/"
          aria-label="BUYBIZ home"
          className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <Logo tone="onDark" size="md" />
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {[
            { href: "/marketplace", label: "Products" },
            { href: "/how-it-works", label: "Solutions" },
            { href: "/pricing", label: "Pricing" },
            { href: "/contact", label: "Support" },
            { href: "/about", label: "About" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-3 text-[12.5px] font-medium text-white/70 transition-colors hover:text-white",
                pathname === link.href && "text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: "inverse", size: "sm" }),
                "h-9 rounded-full px-4 text-[12px] font-semibold",
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-full px-3.5 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: "inverse", size: "sm" }),
                  "h-9 rounded-full px-4 text-[12px] font-semibold",
                )}
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/10"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setMobileOpen(false);
          }}
          className="mobile-site-menu fixed inset-x-0 z-50 overflow-y-auto border-t border-white/[0.06] bg-[#08090B] px-5 pb-10 pt-5 lg:hidden"
        >
          <div className="mx-auto max-w-[560px] space-y-6">
            <MobileGroup title="Buy a proxy">
              {productLinks.map((link) => (
                <MobileLink key={link.href} {...link} />
              ))}
              <MobileLink
                href="/coming-soon/phone-numbers"
                label="Virtual numbers"
                description="Coming soon"
              />
              <MobileLink
                href="/coming-soon/paypal"
                label="PayPal services"
                description="Coming soon"
              />
            </MobileGroup>
            <MobileGroup title="Good to know">
              {solutionLinks.map((link) => (
                <MobileLink key={link.href} {...link} />
              ))}
            </MobileGroup>
            <MobileGroup title="Company">
              {resourceLinks.map((link) => (
                <MobileLink key={link.href} {...link} />
              ))}
            </MobileGroup>
            <div className="flex items-center gap-2 border-t border-white/[0.08] pt-5">
              <Link
                href={isAuthenticated ? "/dashboard" : "/login"}
                className="flex h-11 flex-1 items-center justify-center rounded-full border border-white/15 text-[13px] font-medium text-white"
              >
                {isAuthenticated ? "Dashboard" : "Sign in"}
              </Link>
              <Link
                href={isAuthenticated ? "/dashboard/marketplace" : "/register"}
                className="flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-[#0A0B0D]"
              >
                {isAuthenticated ? "Buy a proxy" : "Create account"}
              </Link>
            </div>
            <p className="pb-4 text-center text-[11px] text-white/35">
              Proxy access is live. Virtual numbers and PayPal services are planned.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="sr-only"
            onClick={() => setMobileOpen(false)}
          >
            Close menu
          </button>
        </div>
      ) : null}
    </header>
  );
}

function MobileGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">
        {title}
      </p>
      <div className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.025]">
        {children}
      </div>
    </div>
  );
}

function MobileLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between border-b border-white/[0.06] px-4 py-3.5 last:border-b-0 hover:bg-white/[0.04]"
    >
      <span className="text-[13px] font-medium text-white">{label}</span>
      <span className="flex items-center gap-2">
        {description ? (
          <span className="text-[10.5px] text-white/35">{description}</span>
        ) : null}
        <ArrowUpRight className="h-3.5 w-3.5 text-white/30" />
      </span>
    </Link>
  );
}
