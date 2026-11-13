import { FlaskConical, ShieldCheck } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { getPaystackMode, isDemoMode } from "@/lib/config";
import type { Profile } from "@/lib/db/types";

export function AdminShell({
  user,
  pendingDeposits,
  openTickets,
  children,
}: {
  user: Profile;
  pendingDeposits: number;
  openTickets: number;
  children: React.ReactNode;
}) {
  return (
    <div data-app-shell className="min-h-dvh bg-background text-foreground">
      <AdminSidebar user={user} />
      <div className="lg:pl-[244px]">
        <AdminTopbar
          user={user}
          pendingDeposits={pendingDeposits}
          openTickets={openTickets}
        />
        <main id="main" className="mx-auto w-full max-w-[1380px] px-4 pb-14 pt-4 sm:px-6 lg:px-8 lg:pt-6">
          <div className="space-y-2.5">
            {!isDemoMode() && getPaystackMode() === "test" ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] border border-info/20 bg-info-soft px-3 py-2 text-[10.5px] leading-4 text-info">
                <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">Paystack test mode</span>
                <span className="text-info/80">
                  Test deposits and test wallet credits are not live money.
                </span>
              </div>
            ) : null}
            {isDemoMode() ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[10.5px] leading-4 text-warning">
                <FlaskConical className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">Demo admin</span>
                <span className="text-warning/80">
                  All metrics come from the local demo database. No real money or customer data is shown.
                </span>
              </div>
            ) : null}
            {user.role === "support" ? (
              <div className="flex items-center gap-2 rounded-[8px] border border-info/20 bg-info-soft px-3 py-2 text-[10.5px] text-info">
                <ShieldCheck className="h-3.5 w-3.5" />
                You have support-only access. Financial and inventory pages are hidden.
              </div>
            ) : null}
          </div>
          <div className="mt-5">{children}</div>
          <div className="mt-10 flex flex-col gap-1.5 border-t border-border pt-4 text-[9px] text-muted-foreground/60 sm:flex-row sm:items-center sm:justify-between">
            <p>BUYBIZ admin console. Financial actions are recorded in the audit log.</p>
            <p>Deposits are liabilities, not revenue.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
