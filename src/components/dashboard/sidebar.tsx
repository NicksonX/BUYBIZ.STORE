"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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
import { logoutAction } from "@/server/actions/auth";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/db/types";

export function DashboardSidebar({ user }: { user: Profile }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("buybiz-dashboard-sidebar") === "collapsed";
    if (saved) {
      // Reading the persisted preference is an external-store sync.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
      document.documentElement.style.setProperty("--dashboard-sidebar", "80px");
    }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    const width = next ? "80px" : "252px";
    document.documentElement.style.setProperty("--dashboard-sidebar", width);
    window.localStorage.setItem(
      "buybiz-dashboard-sidebar",
      next ? "collapsed" : "expanded",
    );
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.06] bg-[#08090B] py-5 text-white transition-[width] duration-200 lg:flex",
        collapsed ? "px-2.5" : "px-3.5",
      )}
      style={{ width: collapsed ? 80 : 252 }}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
        <Link
          href="/"
          aria-label="BUYBIZ home"
          className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Logo tone="onDark" size={collapsed ? "sm" : "md"} wordmark={!collapsed} />
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="mx-auto mt-4 flex h-9 w-9 items-center justify-center rounded-[7px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}

      <nav
        aria-label="Dashboard"
        className={cn("flex-1 space-y-0.5 overflow-y-auto", collapsed ? "mt-5" : "mt-8")}
      >
        {customerNav.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex h-9 items-center rounded-[8px] border border-transparent text-[12px] font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
                active
                  ? "border-white/[0.07] bg-white/[0.075] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white/85",
              )}
            >
              <item.icon
                className={cn(
                  "h-[15px] w-[15px]",
                  active ? "text-white" : "text-white/55 group-hover:text-white/80",
                )}
                strokeWidth={1.7}
              />
              {!collapsed ? item.label : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3">
        <div className="border-t border-white/[0.07]" />

        <Dropdown>
          <DropdownTrigger
            className={cn(
              "flex w-full items-center rounded-[9px] px-2 py-2 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/30",
              collapsed ? "justify-center" : "gap-2.5",
            )}
            aria-label="Account menu"
          >
            <Avatar name={user.displayName || user.username} size="sm" className="border-white/10" />
            {!collapsed ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-medium text-white/90">
                {user.displayName || capitalize(user.username)}
              </span>
              <span className="block truncate text-[9.5px] text-white/55">
                @{user.username}
              </span>
            </span>
            ) : null}
            {!collapsed ? <ChevronDown className="h-3 w-3 text-white/50" /> : null}
          </DropdownTrigger>
          <DropdownContent
            align={collapsed ? "center" : "start"}
            side="top"
            className="w-[220px]"
          >
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
