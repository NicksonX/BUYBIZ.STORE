"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Bell, ChevronDown, Search, Settings, Wallet } from "lucide-react";
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

export function DashboardTopbar({
  user,
  unread,
}: {
  user: Profile;
  unread: number;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="safe-top sticky top-0 z-30 flex min-h-[64px] items-center gap-3 border-b border-border bg-background px-4 sm:bg-background/85 sm:px-6 sm:backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-2.5 lg:hidden">
        <Link href="/dashboard" aria-label="BUYBIZ dashboard">
          <Logo size="sm" />
        </Link>
      </div>

      <form
        action="/dashboard/search"
        method="get"
        role="search"
        className="relative ml-0 hidden w-full max-w-[380px] md:block lg:ml-0"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          type="search"
          name="q"
          placeholder="Search orders, proxies, tickets…"
          aria-label="Search your BUYBIZ data"
          className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-14 text-[11.5px] text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-foreground/25 focus:ring-4 focus:ring-foreground/[0.05]"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-subtle px-1.5 py-0.5 text-[8.5px] font-medium text-muted-foreground">
          ⌘K
        </span>
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Link
          href="/dashboard/search"
          aria-label="Search your account"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        >
          <Search className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard/wallet"
          className="mr-1 hidden h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-[10.5px] font-medium text-foreground/70 transition-colors hover:bg-accent sm:inline-flex"
        >
          <Wallet className="h-3.5 w-3.5" /> Wallet
        </Link>
        <Link
          href="/dashboard/notifications"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:h-8 sm:w-8"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[8px] font-semibold text-background">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>
        <ThemeToggle className="border-0 bg-transparent" />
        <Dropdown>
          <DropdownTrigger className="ml-0.5 outline-none">
            <span className="flex items-center gap-1.5 rounded-full border border-border p-0.5 pr-1.5 transition-colors hover:bg-accent">
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
              <span className="mt-0.5 block text-[9.5px] font-normal normal-case tracking-normal text-muted-foreground">
                @{user.username} · {user.email}
              </span>
            </DropdownLabel>
            <DropdownSeparator />
            <DropdownItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="h-3.5 w-3.5" /> Account settings
              </Link>
            </DropdownItem>
            <DropdownItem asChild>
              <Link href="/dashboard/wallet">
                <Wallet className="h-3.5 w-3.5" /> Wallet
              </Link>
            </DropdownItem>
            <DropdownSeparator />
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full cursor-default items-center rounded-[7px] px-2.5 py-2 text-left text-[12.5px] text-[#B3261E] outline-none transition-colors hover:bg-[#FDECEB] focus:bg-[#FDECEB]"
              >
                Sign out
              </button>
            </form>
          </DropdownContent>
        </Dropdown>
      </div>

    </header>
  );
}
