import { CopyButton } from "@/components/ui/copy-button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField } from "@/components/admin/field";
import { Input, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { createGiveawayAction, giveawayStatusAction } from "@/server/actions/giveaways";
import { getGiveawayAdminData, getGiveawayAnnouncementStats, getGiveawayCode } from "@/server/services/giveaways";
import { formatDateTime } from "@/lib/utils";
import { getDb } from "@/lib/db";
import { SupportAutoRefresh } from "@/components/support/auto-refresh";

export const dynamic = "force-dynamic";

function usd(cents: unknown) { return `$${(Number(cents) / 100).toFixed(2)}`; }

export default async function AdminGiveawaysPage() {
  await requireAdminPage();
  const data = await getGiveawayAdminData();
  const db = await getDb();
  const announcement = await getGiveawayAnnouncementStats(String(data.giveaways[0]?.id ?? ""));
  const codes = new Map<string, string>();
  for (const g of data.giveaways) {
    try { codes.set(String(g.id), await getGiveawayCode(String(g.id))); } catch { /* no code */ }
  }
  return (
    <div className="space-y-4">
      <SupportAutoRefresh intervalMs={30000} />
      <PageHeader eyebrow="Growth" title="Giveaways" description="Create code-gated rewards, monitor claims, and prepare payouts. Treasury signing is not enabled from this screen." />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[["Successful claims", data.claims.length], ["Pending addresses", data.claims.filter((c) => c.addressStatus === "missing").length], ["Addresses submitted", data.claims.filter((c) => c.addressStatus === "submitted").length], ["Paid rewards", data.claims.filter((c) => c.paymentStatus === "paid").length]].map(([label, value]) => <div key={String(label)} className="surface-card rounded-[10px] p-3"><p className="text-[8.5px] text-muted-foreground">{label}</p><p className="tabular mt-1 text-[17px] font-semibold">{value}</p></div>)}
      </div>
      <section className="surface-card mt-2 rounded-[11px] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[10.5px] font-semibold">Announcement delivery · active giveaway</h2><p className="mt-0.5 text-[8.5px] text-muted-foreground">Exact status from the email queue for this giveaway. “Sent” means accepted by the provider, not inbox placement.</p></div><span className="text-[9px] text-muted-foreground">Audience snapshot: {announcement.total} queued/tracked · current eligible: {announcement.eligible}</span></div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">{["sent", "queued", "sending", "failed", "disabled"].map((status) => <div key={status} className="rounded-[8px] bg-surface-subtle px-2 py-1.5"><p className="text-[8px] capitalize text-muted-foreground">{status === "sent" ? "Accepted by provider" : status}</p><p className="tabular mt-0.5 text-[13px] font-semibold">{announcement.statuses[status as keyof typeof announcement.statuses] ?? 0}</p></div>)}</div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-subtle"><div className="h-full rounded-full bg-[#16794A]" style={{ width: `${announcement.total ? Math.round((announcement.statuses.sent / announcement.total) * 100) : 0}%` }} /></div>
      </section>
      <details className="surface-card rounded-[13px] p-4" open>
        <summary className="cursor-pointer list-none text-[12px] font-semibold [&::-webkit-details-marker]:hidden">Create a giveaway</summary>
        <div className="mt-3">
          <AdminActionForm action={createGiveawayAction} submitLabel="Create giveaway" pendingLabel="Creating…">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Title" htmlFor="g-title"><Input id="g-title" name="title" required defaultValue="BUYBIZ $1 Giveaway" /></AdminField>
              <AdminField label="Reward USD" htmlFor="g-reward"><Input id="g-reward" name="rewardUsd" type="number" min="0.01" step="0.01" required defaultValue="1.00" /></AdminField>
              <AdminField label="Claim limit" htmlFor="g-limit"><Input id="g-limit" name="claimLimit" type="number" min="1" max="10000" required defaultValue="20" /></AdminField>
              <AdminField label="Asset" htmlFor="g-asset"><Input id="g-asset" name="asset" defaultValue="USDT" /></AdminField>
              <AdminField label="Network" htmlFor="g-network"><Input id="g-network" name="network" defaultValue="BEP20" /></AdminField>
              <AdminField label="Starts at (optional)" htmlFor="g-start"><Input id="g-start" name="startsAt" type="datetime-local" /></AdminField>
              <AdminField label="Ends at (optional)" htmlFor="g-end"><Input id="g-end" name="endsAt" type="datetime-local" /></AdminField>
              <AdminField label="Description" htmlFor="g-desc" className="sm:col-span-2"><Textarea id="g-desc" name="description" defaultValue="Claim $1 USDT on BNB Smart Chain with the official BUYBIZ giveaway code." /></AdminField>
            </div>
          </AdminActionForm>
        </div>
      </details>

      {data.giveaways.length === 0 ? <p className="surface-card rounded-[13px] p-6 text-center text-[10px] text-muted-foreground">No giveaways created yet.</p> : data.giveaways.map((g) => (
        <section key={String(g.id)} className="surface-card overflow-hidden rounded-[13px]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div><h2 className="text-[12px] font-semibold">{String(g.title)}</h2><p className="mt-0.5 text-[9px] text-muted-foreground">{String(g.asset)} · {String(g.network)} · {usd(g.rewardCents)} per claim · {String(g.claimedCount)}/{String(g.claimLimit)} claimed</p></div>
            <Badge tone={g.status === "active" ? "success" : g.status === "claimed" ? "info" : "neutral"}>{String(g.status)}</Badge>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <p className="text-[9px] text-muted-foreground">Claim code (never share publicly except through the official BUYBIZ channel)</p>
              <div className="flex flex-wrap items-center gap-2"><code className="rounded-[7px] border border-border bg-surface-subtle px-3 py-2 font-mono text-[12px]">{codes.get(String(g.id)) ?? "Unavailable"}</code>{codes.get(String(g.id)) ? <CopyButton value={codes.get(String(g.id))!} label="Copy code" /> : null}</div>
              <p className="text-[9px] text-muted-foreground">Starts {g.startsAt ? formatDateTime(new Date(String(g.startsAt))) : "immediately on activation"}{g.endsAt ? ` · Ends ${formatDateTime(new Date(String(g.endsAt)))}` : ""}</p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {(["active", "paused", "ended"] as const).map((status) => <AdminActionForm key={status} action={giveawayStatusAction} hidden={{ giveawayId: String(g.id), status }} submitLabel={status === "active" ? "Activate & announce" : status === "paused" ? "Pause" : "End"} pendingLabel="Updating…" variant={status === "ended" ? "danger" : "outline"} compact confirmMessage={status === "active" ? "Activate this giveaway and queue the announcement email to all eligible users?" : `Set giveaway to ${status}?`} />)}
            </div>
          </div>
        </section>
      ))}

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Claims</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Payout addresses are visible only in this admin area. Payment signing is not connected.</p></div>
        {data.claims.length === 0 ? <p className="px-4 py-6 text-[10px] text-muted-foreground">No claims yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border bg-surface-subtle/60"><tr>{["Customer", "User ID", "Reward", "Network", "Wallet address", "Verification", "Payment", "Claimed"].map((label) => <th key={label} className="px-3 py-2 text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{data.claims.map((c) => <tr key={String(c.id)}><td className="px-3 py-2 text-[10px]">{String(c.username)}<p className="mt-0.5 text-[8px] text-muted-foreground">{String(c.email)}</p></td><td className="px-3 py-2 font-mono text-[7.5px] text-muted-foreground">{String(c.userId)}</td><td className="px-3 py-2 text-[10px]">{usd(c.rewardCents)}</td><td className="px-3 py-2 text-[8px]">{String(c.network)}</td><td className="max-w-[220px] break-all px-3 py-2 font-mono text-[8px]">{c.walletAddress ? String(c.walletAddress) : "Not submitted"}</td><td className="px-3 py-2 text-[9px] capitalize">{String(c.addressStatus)}</td><td className="px-3 py-2 text-[9px] capitalize">{String(c.paymentStatus)}</td><td className="px-3 py-2 text-[9px] text-muted-foreground">{formatDateTime(new Date(String(c.claimedAt)))}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
