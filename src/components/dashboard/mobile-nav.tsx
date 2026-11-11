"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  Home,
  LifeBuoy,
  MoreHorizontal,
  Network,
  ReceiptText,
  Settings,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { logoutAction } from "@/server/actions/auth";
import { isNavActive, type DashboardNavItem } from "@/components/dashboard/nav-config";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/marketplace", label: "Shop", icon: Store },
  { href: "/dashboard/proxies", label: "Proxies", icon: Network },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
];

const moreItems: DashboardNavItem[] = [
  { href: "/dashboard/orders", label: "My orders", icon: ReceiptText },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardMobileNav({ unread }: { unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const moreActive = moreItems.some((item) => isNavActive(pathname, item));

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More dashboard navigation"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
            className="dashboard-more-menu absolute inset-x-3 overflow-hidden rounded-[18px] border border-border bg-surface p-2.5 shadow-float"
          >
            <div className="mb-1 flex items-center justify-between px-2 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                More
              </p>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[10px] border border-transparent px-3 py-3 text-[12px] font-medium",
                    isNavActive(pathname, item)
                      ? "border-border bg-surface-subtle text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" strokeWidth={1.7} />
                  {item.label}
                  {item.href === "/dashboard/notifications" && unread > 0 ? (
                    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[8px] font-semibold text-background">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <Link
                href="/"
                className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[11.5px] text-muted-foreground hover:bg-accent"
              >
                Back to website <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-[11.5px] font-medium text-danger hover:bg-danger-soft"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Mobile dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_40px_-32px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex h-[64px] max-w-md items-stretch justify-around px-2">
          {primary.map((item) => {
            const active = isNavActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-14 flex-col items-center justify-center gap-1 rounded-[10px] px-2 text-[10px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <item.icon
                  className={cn("h-5 w-5", active && "stroke-[2]")}
                  strokeWidth={1.7}
                />
                {item.label}
                <span
                  className={cn(
                    "h-0.5 w-4 rounded-full transition-colors",
                    active ? "bg-foreground" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Open more navigation"
            className={cn(
              "flex min-w-14 flex-col items-center justify-center gap-1 rounded-[10px] px-2 text-[10px] font-medium transition-colors",
              moreActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.7} />
            More
            <span className="h-0.5 w-4 rounded-full bg-transparent" />
          </button>
        </div>
      </nav>
    </>
  );
}
