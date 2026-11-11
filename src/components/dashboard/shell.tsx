import Link from "next/link";
import { AlertTriangle, ArrowUpRight, FlaskConical, MailWarning } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";
import type { Profile } from "@/lib/db/types";
import { isDemoMode } from "@/lib/config";
import { cn, formatNaira } from "@/lib/utils";

export function DashboardShell({
  user,
  balanceMinor,
  unread,
  children,
}: {
  user: Profile;
  balanceMinor: number;
  unread: number;
  children: React.ReactNode;
}) {
  const demo = isDemoMode();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <DashboardSidebar user={user} balanceMinor={balanceMinor} />
      <div className="dashboard-main">
        <DashboardTopbar user={user} unread={unread} />
        <main
          id="main"
          className="mx-auto w-full max-w-[1240px] px-4 pb-32 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6"
        >
          <div className="space-y-3">
            {demo ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[9px] border border-warning/20 bg-warning-soft px-3 py-2 text-[11px] leading-4 text-warning sm:text-[10.5px]">
                <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">Demo mode</span>
                <span className="text-warning/80">
                  Demo data. Simulated deposits. No real money.
                </span>
              </div>
            ) : null}
            {!user.emailVerified ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[9px] border border-warning/25 bg-warning-soft px-3 py-2 text-[10.5px] leading-4 text-warning">
                <MailWarning className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Verify your email before adding funds or buying a proxy.
                </span>
                <Link
                  href="/verify-email"
                  className="font-semibold underline underline-offset-2"
                >
                  Verify now
                </Link>
              </div>
            ) : null}
            {user.status === "suspended" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[9px] border border-danger/20 bg-danger-soft px-3 py-2 text-[10.5px] leading-4 text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Your account is suspended. Purchases and deposits are disabled.
                </span>
                <Link href="/dashboard/support" className="font-semibold underline underline-offset-2">
                  Contact support
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-5">{children}</div>

          <div className="mt-10 flex flex-col gap-2 border-t border-border pt-5 text-[9.5px] text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between">
            <p>
              BUYBIZ wallet credit is for purchases on BUYBIZ and is not
              cash-withdrawable. Proxy access is shared.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/faq" className="inline-flex items-center gap-0.5 hover:text-foreground">
                Help <ArrowUpRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </main>
      </div>
      <DashboardMobileNav unread={unread} />

      <div className="sr-only" aria-live="polite">
        Wallet balance {formatNaira(balanceMinor, { exact: true })}.
      </div>
    </div>
  );
}
