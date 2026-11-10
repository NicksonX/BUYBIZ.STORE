"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Plus, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { customerNav, isNavActive } from "@/components/dashboard/nav-config";
import { buttonVariants } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth";
import { cn, formatNaira } from "@/lib/utils";
import type { Profile } from "@/lib/db/types";

export function DashboardSidebar({
  user,
  balanceMinor,
}: {
  user: Profile;
  balanceMinor: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-white/[0.06] bg-[#08090B] px-3.5 py-5 text-white lg:flex">
      <div className="px-2">
        <Link
          href="/"
          aria-label="BUYBIZ home"
          className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Logo tone="onDark" size="md" />
        </Link>
      </div>

      <nav aria-label="Dashboard" className="mt-8 flex-1 space-y-0.5 overflow-y-auto">
        {customerNav.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-9 items-center gap-2.5 rounded-[8px] border border-transparent px-2.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-white/[0.07] bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/45 hover:bg-white/[0.04] hover:text-white/80",
              )}
            >
              <item.icon
                className={cn(
                  "h-[15px] w-[15px]",
                  active ? "text-white" : "text-white/40 group-hover:text-white/70",
                )}
                strokeWidth={1.7}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3">
        <div className="relative overflow-hidden rounded-[12px] border border-white/[0.09] bg-white/[0.035] p-3.5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.07] blur-2xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-white/40">
              Wallet balance
            </p>
            <ShieldCheck className="h-3 w-3 text-white/25" />
          </div>
          <p className="tabular mt-2 text-[18px] font-semibold leading-none tracking-[-0.04em]">
            {formatNaira(balanceMinor, { exact: true })}
          </p>
          <Link
            href="/dashboard/wallet"
            className={cn(
              buttonVariants({ variant: "inverse", size: "sm" }),
              "mt-3 h-8 w-full rounded-full text-[10.5px] font-semibold",
            )}
          >
            <Plus className="h-3 w-3" /> Add funds
          </Link>
          <p className="mt-2 text-center text-[8px] text-white/25">
            Not cash-withdrawable
          </p>
        </div>

        <div className="border-t border-white/[0.07]" />

        <Dropdown>
          <DropdownTrigger className="flex w-full items-center gap-2.5 rounded-[9px] px-2 py-2 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/30">
            <Avatar name={user.displayName || user.username} size="sm" className="border-white/10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-medium text-white/90">
                {user.displayName || capitalize(user.username)}
              </span>
              <span className="block truncate text-[9.5px] text-white/35">
                @{user.username}
              </span>
            </span>
            <ChevronDown className="h-3 w-3 text-white/30" />
          </DropdownTrigger>
          <DropdownContent align="start" side="top" className="w-[220px]">
            <DropdownLabel>Account</DropdownLabel>
            <DropdownItem asChild>
              <Link href="/dashboard/settings">Settings</Link>
            </DropdownItem>
            <DropdownItem asChild>
              <Link href="/dashboard/notifications">Notifications</Link>
            </DropdownItem>
            <DropdownItem asChild>
              <Link href="/">Back to website</Link>
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
    </aside>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
