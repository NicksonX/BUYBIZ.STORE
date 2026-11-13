import Link from "next/link";
import { Snowflake, TimerReset, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField } from "@/components/admin/field";
import { Textarea } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/server/auth/guards";
import { getInactivityOverview } from "@/server/data/admin";
import { reactivateUserAction, runAdminJobsAction } from "@/server/actions/admin";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminInactivityPage() {
  await requireAdminPage();
  const data = await getInactivityOverview();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Inactivity monitoring"
        description={`Customers are frozen after ${data.days} consecutive days without meaningful activity. A ${data.warningDays}-day warning appears in the notification centre first.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/settings" className="inline-flex h-8 items-center rounded-full border border-border px-3.5 text-[10px] font-medium hover:bg-accent">
              Change policy
            </Link>
            <AdminActionForm
              action={runAdminJobsAction}
              submitLabel="Run inactivity check"
              pendingLabel="Checking…"
              variant="outline"
              compact
              confirmMessage="Run the inactivity and reminder jobs now?"
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Frozen accounts" value={data.frozen.length} icon={Snowflake} hint="Wallet preserved" />
        <StatCard label="Approaching freeze" value={data.approaching.length} icon={TimerReset} hint={`Within ${data.warningDays} days`} />
        <StatCard label="Policy" value={`${data.days} days`} icon={Users} hint="Configurable in Settings" />
        <StatCard label="Logged reactivations" value={data.history.length} icon={TimerReset} hint="Latest 30 shown" />
      </div>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Frozen accounts</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Balances are preserved exactly. An administrator unfreeze waives the self-reactivation fee and is audited.
          </p>
        </div>
        {data.frozen.length === 0 ? (
          <div className="p-4">
            <EmptyState compact icon={Snowflake} title="No frozen accounts" description="No customer is currently frozen for inactivity." />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.frozen.map((account) => (
              <div key={account.id} className="grid gap-3 px-4 py-3.5 lg:grid-cols-[1fr_160px_200px]">
                <div>
                  <Link href={`/admin/users/${account.id}`} className="text-[11px] font-medium hover:underline">
                    {account.username}
                  </Link>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{account.email}</p>
                  <p className="mt-1.5 text-[9px] text-muted-foreground">
                    Last activity {formatDateTime(account.lastActivityAt)}
                  </p>
                  <p className="mt-0.5 text-[9px] text-warning">
                    {account.freezeReason ?? "Frozen for inactivity"} · frozen {formatDateTime(account.frozenAt)}
                  </p>
                </div>
                <div className="self-center">
                  <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Preserved wallet</p>
                  <p className="tabular mt-1 text-[12px] font-semibold">{formatNaira(account.balanceMinor, { exact: true })}</p>
                  <Badge tone="warning" className="mt-1.5">Frozen</Badge>
                </div>
                <div>
                  <AdminActionForm
                    action={reactivateUserAction}
                    hidden={{ userId: account.id }}
                    submitLabel="Unfreeze account"
                    pendingLabel="Unfreezing…"
                    variant="outline"
                    compact
                    confirmMessage="Unfreeze this account and waive the reactivation fee?"
                  >
                    <AdminField label="Reason" htmlFor={`reason-${account.id}`}>
                      <Textarea id={`reason-${account.id}`} name="reason" required minLength={5} className="min-h-16 text-[10px]" placeholder="Reason for waiving the fee" />
                    </AdminField>
                  </AdminActionForm>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Approaching inactivity</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">Customers who have not been touched by the warning job yet may appear here.</p>
        </div>
        {data.approaching.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No customers in the warning window.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.approaching.map((account) => (
              <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link href={`/admin/users/${account.id}`} className="text-[11px] font-medium hover:underline">{account.username}</Link>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">Last activity {formatDateTime(account.lastActivityAt)}</p>
                </div>
                <span className="text-[10px] tabular font-medium">{formatNaira(account.balanceMinor, { exact: true })}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Reactivation history</h2>
        </div>
        {data.history.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No reactivations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead className="border-b border-border bg-surface-subtle/60">
                <tr>
                  {["Customer", "Method", "Fee", "Reactivated"].map((label) => (
                    <th key={label} className="px-4 py-2 text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.history.map((row, index) => (
                  <tr key={`${row.username}-${index}`}>
                    <td className="px-4 py-2.5 text-[10px]">{row.username}</td>
                    <td className="px-4 py-2.5 text-[9px] capitalize">{row.method}</td>
                    <td className="px-4 py-2.5 tabular text-[9px]">{formatNaira(row.feeMinor, { exact: true })}</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(row.reactivatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
