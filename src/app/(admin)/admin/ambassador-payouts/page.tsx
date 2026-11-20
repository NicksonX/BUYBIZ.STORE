import { BadgeDollarSign, Clock3, Send, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField } from "@/components/admin/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getAmbassadorPayouts } from "@/server/data/ambassador";
import {
  approveAmbassadorPayoutAction,
  bulkVerifyPendingAddressesAction,
  markAmbassadorPayoutPaidAction,
  rejectAmbassadorPayoutAction,
  verifyAmbassadorAddressAction,
  updateAmbassadorSettingsAction,
} from "@/server/actions/admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function lagosDateInput(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

const payoutTone = {
  pending: "warning",
  processing: "info",
  paid: "success",
  rejected: "danger",
} as const;

export default async function AmbassadorPayoutsPage() {
  await requireAdminPage();
  const data = await getAmbassadorPayouts();

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Finance"
        title="Ambassador payouts"
        description="USD commissions are separate from BUYBIZ naira wallet credits. Payouts are funded and sent manually by an administrator; BUYBIZ never marks one paid automatically."
      />

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Ambassadors" value={data.stats.ambassadors} icon={BadgeDollarSign} hint="Promoted automatically" />
        <StatCard label="Pending payouts" value={data.stats.pendingCount} icon={Clock3} hint={usd(data.stats.pendingCents)} />
        <StatCard label="Paid to date" value={usd(data.stats.paidCents)} icon={Send} hint="Recorded manual transfers" />
        <StatCard label="Unreserved earnings" value={usd(data.stats.availableCents)} icon={WalletCards} hint="All ambassador balances" />
      </div>

      <section className="surface-card rounded-[13px] p-4">
        <h2 className="text-[12px] font-semibold">Programme settings</h2>
        <p className="mt-0.5 text-[9px] text-muted-foreground">
          Change the qualifying task without code. The $10 payout floor cannot be lowered. Commissions are uncapped per Ambassador; the referral count is only the unlock threshold.
        </p>
        <div className="mt-3">
          <AdminActionForm action={updateAmbassadorSettingsAction} submitLabel="Save programme settings" pendingLabel="Saving…">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AdminField label="Qualified referrals required" htmlFor="amb-referrals"><Input id="amb-referrals" name="referralsRequired" type="number" min={1} max={100} defaultValue={data.config.referralsRequired} /></AdminField>
              <AdminField label="Commission per referral (USD)" htmlFor="amb-commission"><Input id="amb-commission" name="commissionUsd" inputMode="decimal" defaultValue={(data.config.commissionCents / 100).toFixed(2)} /></AdminField>
              <AdminField label="Minimum payout (USD)" htmlFor="amb-minimum"><Input id="amb-minimum" name="minimumUsd" inputMode="decimal" min={10} defaultValue={(data.config.withdrawalMinCents / 100).toFixed(2)} /></AdminField>
              <div className="rounded-[9px] border border-border bg-surface-subtle px-3 py-2.5 text-[9.5px] leading-4 text-muted-foreground">
                <strong className="text-foreground">Qualifying activity:</strong> a completed proxy purchase of 7 days or more. Wallet deposits alone do not qualify.
              </div>
              <AdminField label="Next $3 payout batch (payout date, not end date)" htmlFor="amb-payout-date"><Input id="amb-payout-date" name="nextPayoutAt" type="date" defaultValue={lagosDateInput(data.config.nextPayoutAt)} /></AdminField>
              <label className="mt-5 flex items-center gap-2 text-[9.5px] text-muted-foreground">
                <input type="checkbox" name="enabled" defaultChecked={data.config.enabled} className="h-3.5 w-3.5 accent-foreground" />
                Enable automatic promotion and commissions
              </label>
            </div>
          </AdminActionForm>
        </div>
      </section>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div><h2 className="text-[12px] font-semibold">USDT address verification</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">Validate ownership before enabling withdrawals. Admin review is persisted and audited.</p></div>
          <AdminActionForm action={bulkVerifyPendingAddressesAction} submitLabel="Verify all pending" pendingLabel="Verifying…" variant="outline" compact refreshOnSuccess confirmMessage="Verify all pending addresses except your own? This is an explicit administrative review and will be audited." />
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Validate that the address belongs to the ambassador before enabling withdrawals. BUYBIZ checks BEP20 format; the administrator remains responsible for ownership checks.
          </p>
        </div>
        {data.addresses.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No wallet addresses awaiting verification.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.addresses.map((address) => (
              <div key={address.id} className="grid gap-3 px-4 py-3.5 lg:grid-cols-[1fr_1fr_260px]">
                <div>
                  <p className="text-[11px] font-medium">{address.username}</p>
                  <p className="text-[9px] text-muted-foreground">{address.email}</p>
                  <p className="mt-1 text-[8.5px] text-muted-foreground">{formatDateTime(address.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">BEP20 address</p>
                  <p className="mt-1 break-all font-mono text-[9.5px]">{address.address}</p>
                  <Badge tone="warning" className="mt-1.5">Pending verification</Badge>
                </div>
                <div className="space-y-2">
                  <AdminActionForm
                    action={verifyAmbassadorAddressAction}
                    hidden={{ addressId: address.id, decision: "verify" }}
                    submitLabel="Verify address"
                    pendingLabel="Verifying…"
                    variant="outline"
                    compact
                    refreshOnSuccess
                    confirmMessage="Confirm this BEP20 address format and ownership check?"
                  />
                  <AdminActionForm
                    action={verifyAmbassadorAddressAction}
                    hidden={{ addressId: address.id, decision: "reject" }}
                    submitLabel="Reject address"
                    pendingLabel="Rejecting…"
                    variant="danger"
                    compact
                    refreshOnSuccess
                    confirmMessage="Reject this payout address?"
                  >
                    <AdminField label="Reason" htmlFor={`address-reason-${address.id}`}>
                      <Input id={`address-reason-${address.id}`} name="reason" required minLength={5} placeholder="Why is this address rejected?" />
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
          <h2 className="text-[12px] font-semibold">Payout requests</h2>
          <p className="mt-0.5 text-[9px] text-muted-foreground">
            Approve to reserve the request for processing. Mark paid only after you have sent USDT on BEP20 and have the transaction hash.
          </p>
        </div>
        {data.withdrawals.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No ambassador payout requests yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.withdrawals.map((payout) => (
              <div key={payout.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold">{payout.username}</p>
                    <p className="text-[9px] text-muted-foreground">{payout.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-[15px] font-semibold">{usd(payout.amountCents)}</span>
                    <Badge tone={payoutTone[payout.status as keyof typeof payoutTone] ?? "neutral"}>{payout.status}</Badge>
                  </div>
                </div>
                <div className="mt-2.5 grid gap-2 text-[9px] sm:grid-cols-2 lg:grid-cols-4">
                  <div><span className="text-muted-foreground">Network</span><p className="mt-0.5 font-medium">{payout.network}</p></div>
                  <div><span className="text-muted-foreground">Requested</span><p className="mt-0.5">{formatDateTime(payout.requestedAt)}</p></div>
                  <div><span className="text-muted-foreground">Approved</span><p className="mt-0.5">{payout.approvedAt ? formatDateTime(payout.approvedAt) : "Not yet"}</p></div>
                  <div><span className="text-muted-foreground">Paid</span><p className="mt-0.5">{payout.paidAt ? formatDateTime(payout.paidAt) : "Not yet"}</p></div>
                </div>
                <div className="mt-2 rounded-[8px] border border-border bg-surface-subtle px-3 py-2">
                  <p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">USDT BEP20 wallet</p>
                  <p className="mt-1 break-all font-mono text-[9.5px]">{payout.walletAddress}</p>
                  {payout.transactionHash ? (
                    <p className="mt-1.5 break-all text-[9px] text-success">Tx: {payout.transactionHash}</p>
                  ) : null}
                  {payout.rejectionReason ? (
                    <p className="mt-1.5 text-[9px] text-danger">Reason: {payout.rejectionReason}</p>
                  ) : null}
                </div>
                {["pending", "processing"].includes(payout.status) ? (
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    {payout.status === "pending" ? (
                      <AdminActionForm
                        action={approveAmbassadorPayoutAction}
                        hidden={{ payoutId: payout.id }}
                        submitLabel="Approve for processing"
                        pendingLabel="Approving…"
                        variant="outline"
                        compact
                        confirmMessage="Approve this payout for manual processing?"
                      />
                    ) : (
                      <AdminActionForm
                        action={markAmbassadorPayoutPaidAction}
                        hidden={{ payoutId: payout.id }}
                        submitLabel="Mark paid"
                        pendingLabel="Recording…"
                        variant="outline"
                        compact
                        confirmMessage="Only continue after the USDT transfer is complete. Record this payout as paid?"
                      >
                        <AdminField label="BEP20 transaction hash" htmlFor={`tx-${payout.id}`}>
                          <Input id={`tx-${payout.id}`} name="transactionHash" required placeholder="0x..." />
                        </AdminField>
                      </AdminActionForm>
                    )}
                    <AdminActionForm
                      action={rejectAmbassadorPayoutAction}
                      hidden={{ payoutId: payout.id }}
                      submitLabel="Reject payout"
                      pendingLabel="Rejecting…"
                      variant="danger"
                      compact
                      confirmMessage="Reject this payout and release the reserved amount?"
                    >
                      <AdminField label="Rejection reason" htmlFor={`reject-${payout.id}`}>
                        <Textarea id={`reject-${payout.id}`} name="reason" required minLength={5} className="min-h-16 text-[10px]" />
                      </AdminField>
                    </AdminActionForm>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Ambassadors</h2>
        </div>
        {data.ambassadors.length === 0 ? (
          <p className="px-4 py-6 text-center text-[10px] text-muted-foreground">No ambassadors yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead className="border-b border-border bg-surface-subtle/60">
                <tr>{["Ambassador", "Promoted", "Qualified referrals", "Commission earned"].map((label) => <th key={label} className="px-4 py-2 text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.ambassadors.map((ambassador) => (
                  <tr key={ambassador.userId}>
                    <td className="px-4 py-2.5 text-[10px]">{ambassador.username}<p className="text-[8.5px] text-muted-foreground">{ambassador.email}</p></td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(ambassador.promotedAt)}</td>
                    <td className="px-4 py-2.5 tabular text-[9px]">{ambassador.qualified}</td>
                    <td className="px-4 py-2.5 tabular text-[9px]">{usd(ambassador.earnedCents)}</td>
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
