"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/server/actions/auth";
import type { Profile } from "@/lib/db/types";
import {
  adminNav,
  isAdminNavActive,
  supportOnlyNav,
} from "@/components/admin/nav-config";
import { cn } from "@/lib/utils";

export function AdminSidebar({ user }: { user: Profile }) {
  const pathname = usePathname();
  const items = user.role === "support" ? supportOnlyNav : adminNav;
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] flex-col border-r border-white/[0.06] bg-[#08090B] px-3 py-4 text-white lg:flex">
      <div className="px-2">
        <Link href="/admin" aria-label="BUYBIZ admin">
          <Logo tone="onDark" size="md" />
        </Link>
        <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/25">
          Admin console
        </p>
      </div>

      <nav aria-label="Admin" className="mt-6 flex-1 space-y-4 overflow-y-auto pb-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="px-2.5 pb-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-white/25">
              {group}
            </p>
            <div className="space-y-0.5">
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const active = isAdminNavActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex h-8 items-center gap-2.5 rounded-[7px] border border-transparent px-2.5 text-[11.5px] font-medium transition-colors",
                        active
                          ? "border-white/[0.07] bg-white/[0.08] text-white"
                          : "text-white/45 hover:bg-white/[0.04] hover:text-white/80",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-3.5 w-3.5",
                          active ? "text-white" : "text-white/35 group-hover:text-white/65",
                        )}
                        strokeWidth={1.7}
                      />
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.07] pt-3">
        <div className="flex items-center gap-2 px-1.5">
          <Avatar
            name={user.displayName || user.username}
            size="sm"
            className="border-white/10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-white/90">
              {user.displayName || user.username}
            </p>
            <p className="truncate text-[9px] capitalize text-white/35">
              {user.role.replace("_", " ")}
            </p>
          </div>
          <Link
            href="/"
            aria-label="Back to website"
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-white/30 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <form action={logoutAction} className="mt-2">
          <button
            type="submit"
            className="flex h-8 w-full items-center gap-2 rounded-[7px] px-2.5 text-[10.5px] text-white/35 transition-colors hover:bg-white/[0.04] hover:text-white/70"
          >
            <LogOut className="h-3 w-3" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
