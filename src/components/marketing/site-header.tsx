"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/dropdown";
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
    description: "Up to 10 customers per upstream",
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

function NavDropdown({
  label,
  links,
  bottomLink,
}: {
  label: string;
  links: { href: string; label: string; description?: string }[];
  bottomLink?: { href: string; label: string };
}) {
  return (
    <Dropdown>
      <DropdownTrigger className="group inline-flex h-9 items-center gap-1 rounded-full px-3 text-[12.5px] font-medium text-white/70 outline-none transition-colors hover:text-white data-[state=open]:text-white focus-visible:ring-2 focus-visible:ring-white/40">
        {label}
        <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownTrigger>
      <DropdownContent
        align="start"
        className="w-[290px] border-white/10 bg-[#0E1013] p-2 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,1)]"
      >
        {links.map((link) => (
          <DropdownItem
            key={link.href}
            asChild
            className="items-start gap-0 px-3 py-2.5 focus:bg-white/[0.07]"
          >
            <Link href={link.href}>
              <span className="flex flex-col gap-0.5">
                <span className="text-[12.5px] font-medium text-white">
                  {link.label}
                </span>
                {link.description ? (
                  <span className="text-[11px] leading-4 text-white/45">
                    {link.description}
                  </span>
                ) : null}
              </span>
            </Link>
          </DropdownItem>
        ))}
        {bottomLink ? (
          <>
            <div className="my-1.5 h-px bg-white/[0.07]" />
            <DropdownItem asChild className="px-3 py-2.5 focus:bg-white/[0.07]">
              <Link
                href={bottomLink.href}
                className="flex items-center justify-between text-white/70"
              >
                {bottomLink.label}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </DropdownItem>
          </>
        ) : null}
      </DropdownContent>
    </Dropdown>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#08090B]/88 text-white backdrop-blur-xl">
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
          <NavDropdown
            label="Products"
            links={productLinks}
            bottomLink={{ href: "/coming-soon", label: "See what's coming" }}
          />
          <NavDropdown label="Solutions" links={solutionLinks} />
          <NavDropdown label="Resources" links={resourceLinks} />
          <Link
            href="/pricing"
            className={cn(
              "inline-flex h-9 items-center rounded-full px-3 text-[12.5px] font-medium text-white/70 transition-colors hover:text-white",
              pathname === "/pricing" && "text-white",
            )}
          >
            Pricing
          </Link>
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
                Get started
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={isAuthenticated ? "/dashboard" : "/register"}
            className={cn(
              buttonVariants({ variant: "inverse", size: "sm" }),
              "h-8 rounded-full px-3.5 text-[11.5px] font-semibold sm:hidden",
            )}
          >
            {isAuthenticated ? "Dashboard" : "Get started"}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/10"
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
          className="fixed inset-x-0 top-[64px] z-50 h-[calc(100dvh-64px)] overflow-y-auto border-t border-white/[0.06] bg-[#08090B] px-5 pb-10 pt-5 lg:hidden"
        >
          <div className="mx-auto max-w-[560px] space-y-6">
            <MobileGroup title="Products">
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
            <MobileGroup title="Solutions">
              {solutionLinks.map((link) => (
                <MobileLink key={link.href} {...link} />
              ))}
            </MobileGroup>
            <MobileGroup title="Resources">
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
                {isAuthenticated ? "Buy a proxy" : "Get started"}
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
      className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 last:border-b-0 hover:bg-white/[0.04]"
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
