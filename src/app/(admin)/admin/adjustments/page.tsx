import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ArrowLeftRight, BadgeDollarSign, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import {
  getAdminUserOptions,
  getRecentAdminAdjustments,
} from "@/server/data/admin";
import { adjustWalletAction } from "@/server/actions/admin";
import { formatDateTime, formatSignedNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAdjustmentsPage() {
  await requireAdminPage();
  const [users, adjustments] = await Promise.all([
    getAdminUserOptions(),
    getRecentAdminAdjustments(30),
  ]);
  const adjustmentKey = randomUUID();

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Refunds and wallet credits"
        description="Manual wallet adjustments for corrections, goodwill or approved refunds. All movements are internal wallet credits or debits."
      />

      <div className="mt-4 grid items-start gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="surface-card rounded-[14px] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface-subtle">
              <BadgeDollarSign className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[12px] font-semibold">New adjustment</h2>
              <p className="text-[9px] text-muted-foreground">
                Requires a reason and confirmation.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <AdminActionForm
              action={adjustWalletAction}
              hidden={{ adjustmentKey }}
              submitLabel="Record adjustment"
              pendingLabel="Recording…"
              confirmMessage="Apply this wallet adjustment? It will be recorded permanently in the ledger."
            >
              <AdminField label="Customer" htmlFor="adjust-user">
                <Select id="adjust-user" name="userId" required defaultValue="">
                  <option value="" disabled>Select a customer</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </Select>
              </AdminField>
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Direction" htmlFor="adjust-direction">
                  <Select id="adjust-direction" name="direction" defaultValue="credit">
                    <option value="credit">Credit wallet</option>
                    <option value="debit">Debit wallet</option>
                  </Select>
                </AdminField>
                <AdminField label="Amount (NGN)" htmlFor="adjust-amount">
                  <Input id="adjust-amount" name="amount" inputMode="decimal" required placeholder="5000" />
                </AdminField>
              </div>
              <AdminField label="Reason" htmlFor="adjust-reason">
                <Textarea id="adjust-reason" name="reason" required minLength={8} className="min-h-24 text-[11px]" placeholder="Explain what this corrects and why. This is visible in the ledger." />
              </AdminField>
              <label className="flex items-start gap-2 text-[9.5px] leading-4 text-muted-foreground">
                <input type="checkbox" name="confirm" required className="mt-0.5 h-3.5 w-3.5 accent-foreground" />
                I confirm this adjustment. Debits cannot take a balance below zero, and nothing can be deleted.
              </label>
            </AdminActionForm>
          </div>
        </section>

        <div className="space-y-3">
          <AdminNote tone="warning">
            Refunds are credits to the internal BUYBIZ wallet only. They are not
            bank transfers. Never represent an adjustment as a cash refund.
          </AdminNote>
          <AdminNote>
            The ledger reference is unique per adjustment form. Repeated submission
            of the same adjustment is rejected by the database.
          </AdminNote>
          <div className="rounded-[10px] border border-border bg-surface p-3 text-[9px] leading-4 text-muted-foreground">
            <ShieldCheck className="mb-1 h-3 w-3" />
            Every adjustment writes an immutable ledger entry and an audit row with
            your admin account, IP address and user agent.
          </div>
        </div>
      </div>

      <section className="surface-card mt-4 overflow-hidden rounded-[14px]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Recent admin adjustments</h2>
          <Link href="/admin/ledger?type=admin_credit" className="inline-flex items-center gap-1 text-[9.5px] text-muted-foreground hover:text-foreground">
            Full ledger <ArrowLeftRight className="h-3 w-3" />
          </Link>
        </div>
        {adjustments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-subtle/60">
                  {["Customer", "Type", "Amount", "Reason", "By", "Date"].map((label) => (
                    <th key={label} className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {adjustments.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/users/${entry.userId}`} className="text-[10px] font-medium hover:underline">{entry.username}</Link>
                      <p className="mt-0.5 text-[8px] text-muted-foreground">{entry.email}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={entry.entryType === "admin_credit" ? "success" : "danger"}>
                        {entry.entryType === "admin_credit" ? "Credit" : "Debit"}
                      </Badge>
                    </td>
                    <td className={`tabular px-4 py-2.5 text-[10px] font-medium ${entry.amountMinor > 0 ? "text-success" : "text-foreground"}`}>
                      {formatSignedNaira(entry.amountMinor)}
                    </td>
                    <td className="max-w-[260px] px-4 py-2.5 text-[9.5px] text-muted-foreground">{entry.description}</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{entry.createdByName ?? "System"}</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-[10px] text-muted-foreground">No admin adjustments yet.</p>
        )}
      </section>
    </div>
  );
}
