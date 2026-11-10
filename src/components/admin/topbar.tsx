"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  CreditCard,
  LifeBuoy,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { logoutAction } from "@/server/actions/auth";
import type { Profile } from "@/lib/db/types";
import {
  adminNav,
  isAdminNavActive,
  supportOnlyNav,
} from "@/components/admin/nav-config";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminTopbar({
  user,
  pendingDeposits,
  openTickets,
}: {
  user: Profile;
  pendingDeposits: number;
  openTickets: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const items = user.role === "support" ? supportOnlyNav : adminNav;
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[62px] items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open admin navigation"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link href="/admin" className="lg:hidden" aria-label="BUYBIZ admin dashboard">
          <Logo size="sm" />
        </Link>

        <form
          action="/admin/search"
          method="get"
          role="search"
          className="relative hidden w-full max-w-[360px] md:block"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            placeholder="Search users, orders, tickets…"
            aria-label="Search admin records"
            suppressHydrationWarning
            className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-[11.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-foreground/25 focus:ring-4 focus:ring-foreground/[0.05]"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/admin/deposits?status=pending"
            className="relative hidden h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            <CreditCard className="h-3.5 w-3.5" /> Deposits
            {pendingDeposits > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warning-soft px-1 text-[8px] font-semibold text-warning">
                {pendingDeposits}
              </span>
            ) : null}
          </Link>
          <Link
            href="/admin/support"
            aria-label={`Support tickets${openTickets ? `, ${openTickets} open` : ""}`}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LifeBuoy className="h-4 w-4" />
            {openTickets > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[8px] font-semibold text-background">
                {openTickets > 9 ? "9+" : openTickets}
              </span>
            ) : null}
          </Link>
          <ThemeToggle className="border-0 bg-transparent" />
          <Dropdown>
            <DropdownTrigger className="ml-0.5 outline-none">
              <span className="flex items-center gap-1.5 rounded-full border border-border p-0.5 pr-1.5 hover:bg-accent">
                <Avatar
                  name={user.displayName || user.username}
                  size="sm"
                  className="h-7 w-7 text-[9px]"
                />
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </span>
            </DropdownTrigger>
            <DropdownContent align="end" className="w-[230px]">
              <DropdownLabel>
                <span className="block text-[11px] normal-case tracking-normal text-foreground">
                  {user.displayName || user.username}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[9px] font-normal normal-case tracking-normal text-muted-foreground">
                  <ShieldCheck className="h-2.5 w-2.5" />{" "}
                  {user.role.replace("_", " ")}
                </span>
              </DropdownLabel>
              <DropdownSeparator />
              <DropdownItem asChild>
                <Link href="/admin/settings">
                  <Settings className="h-3.5 w-3.5" /> Settings
                </Link>
              </DropdownItem>
              <DropdownItem asChild>
                <Link href="/">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Back to website
                </Link>
              </DropdownItem>
              <DropdownItem asChild>
                <Link href="/dashboard">
                  <ArrowUpRight className="h-3.5 w-3.5" /> Customer view
                </Link>
              </DropdownItem>
              <DropdownSeparator />
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full cursor-default items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-[12.5px] text-[#B3261E] outline-none hover:bg-[#FDECEB] focus:bg-[#FDECEB]"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </form>
            </DropdownContent>
          </Dropdown>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 w-[290px] overflow-y-auto bg-[#08090B] px-3 py-4 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-2">
              <Logo tone="onDark" size="sm" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="mt-5 space-y-4">
              {groups.map((group) => (
                <div key={group}>
                  <p className="px-2.5 pb-1 text-[9px] uppercase tracking-[0.1em] text-white/25">
                    {group}
                  </p>
                  {items
                    .filter((item) => item.group === group)
                    .map((item) => {
                      const active = isAdminNavActive(pathname, item);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex h-9 items-center gap-2.5 rounded-[7px] px-2.5 text-[12px] font-medium",
                            active
                              ? "bg-white/[0.09] text-white"
                              : "text-white/45 hover:bg-white/[0.05] hover:text-white/80",
                          )}
                        >
                          <item.icon className="h-4 w-4" strokeWidth={1.7} />
                          {item.label}
                        </Link>
                      );
                    })}
                </div>
              ))}
            </nav>
            <div className="mt-6 border-t border-white/[0.07] pt-4">
              <p className="px-2.5 text-[10px] text-white/35">
                {user.username} · {user.role.replace("_", " ")}
              </p>
              <form action={logoutAction} className="mt-2">
                <button
                  type="submit"
                  className="flex h-9 w-full items-center gap-2 rounded-[7px] px-2.5 text-[11px] text-white/40 hover:bg-white/[0.05] hover:text-white/80"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
