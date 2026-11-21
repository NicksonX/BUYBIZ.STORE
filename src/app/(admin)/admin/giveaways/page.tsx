import { CopyButton } from "@/components/ui/copy-button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField } from "@/components/admin/field";
import { Input, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { createGiveawayAction, giveawayStatusAction, updateGiveawaySettingsAction, sendWinnerAnnouncementAction } from "@/server/actions/giveaways";
import { getGiveawayAdminData, getGiveawayAnnouncementStats, getGiveawayCode, getGiveawayWinners } from "@/server/services/giveaways";
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
  const latestGiveawayId = String(data.giveaways[0]?.id ?? "");
  const winners = latestGiveawayId ? await getGiveawayWinners(latestGiveawayId) : [];
  const winnerPool = winners.reduce((sum, w) => sum + w.rewardCents, 0);
  const announcementPending = winners.filter((w) => w.announcementStatus !== "sent").length;
  const codes = new Map<string, string>();
  for (const g of data.giveaways) {
    try { codes.set(String(g.id), await getGiveawayCode(String(g.id))); } catch { /* no code */ }
  }
  return (
    <div className="space-y-4">
      <SupportAutoRefresh intervalMs={30000} />
      <PageHeader eyebrow="Growth" title="Giveaways" description="Create code-gated rewards, monitor claims, and prepare payouts. Treasury signing is not enabled from this screen." />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[["Winners", data.claims.filter((c) => Boolean(c.isWinner)).length], ["Participants", data.claims.filter((c) => !c.isWinner).length], ["Winners with address", data.claims.filter((c) => c.isWinner && c.addressStatus === "submitted").length], ["Paid rewards", data.claims.filter((c) => c.paymentStatus === "paid").length]].map(([label, value]) => <div key={String(label)} className="surface-card rounded-[10px] p-3"><p className="text-[8.5px] text-muted-foreground">{label}</p><p className="tabular mt-1 text-[17px] font-semibold">{value}</p></div>)}
      </div>
      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3"><div><h2 className="text-[12px] font-semibold">Giveaway winners</h2><p className="mt-0.5 text-[9px] text-muted-foreground">First 20 successful claims are winners. Later entries are participants without reward eligibility.</p></div><span className="text-[9px] text-muted-foreground">{winners.length} winners · {usd(winnerPool)} total</span></div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4"><div className="rounded-[8px] bg-surface-subtle p-2"><p className="text-[8px] text-muted-foreground">Verified winners</p><p className="tabular text-[15px] font-semibold">{winners.length}</p></div><div className="rounded-[8px] bg-surface-subtle p-2"><p className="text-[8px] text-muted-foreground">Wallets submitted</p><p className="tabular text-[15px] font-semibold">{winners.filter((w) => w.addressStatus === "submitted").length}</p></div><div className="rounded-[8px] bg-surface-subtle p-2"><p className="text-[8px] text-muted-foreground">Awaiting announcement</p><p className="tabular text-[15px] font-semibold">{announcementPending}</p></div><div className="rounded-[8px] bg-surface-subtle p-2"><p className="text-[8px] text-muted-foreground">Treasury</p><p className="text-[11px] font-semibold text-warning">Not configured</p></div></div>
        <div className="mx-3 mb-3 rounded-[9px] border border-border bg-surface-subtle p-3"><p className="text-[9px] font-semibold">Winner announcement email — preview only</p><p className="mt-1 text-[9px] font-medium">Congratulations! You're a BUYBIZ Giveaway Winner 🎉</p><p className="mt-1 text-[8.5px] leading-4 text-muted-foreground">Hi [first name], Congratulations! You're officially one of the winners... Your reward is now being prepared for payout. We'll send another notification when payment is complete.</p><p className="mt-1 text-[8px] text-muted-foreground">Recipients: {winners.length} verified winners. No email has been sent yet.</p><div className="mt-2"><AdminActionForm action={sendWinnerAnnouncementAction} hidden={{ giveawayId: latestGiveawayId }} submitLabel="Approve & send winner emails" pendingLabel="Queueing…" variant="outline" compact refreshOnSuccess confirmMessage={`Send the winner announcement to ${winners.length} verified winners?`} /></div></div>
        {winners.length===0 ? <p className="px-4 py-5 text-[9px] text-muted-foreground">No verified winners for the latest giveaway.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="border-b border-border bg-surface-subtle/60"><tr>{["#", "Winner", "Reward", "Wallet", "Announcement", "Payment"].map((h) => <th key={h} className="px-3 py-2 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">{h}</th>)}</tr></thead><tbody className="divide-y divide-border">{winners.map((w) => <tr key={w.claimId}><td className="px-3 py-2 text-[9px]">{w.winnerPosition ?? "—"}</td><td className="px-3 py-2 text-[9px]">{w.username}<p className="text-[8px] text-muted-foreground">{w.email}</p></td><td className="px-3 py-2 text-[9px]">{usd(w.rewardCents)}</td><td className="max-w-[180px] break-all px-3 py-2 font-mono text-[7.5px]">{w.walletAddress ?? "Not submitted"}</td><td className="px-3 py-2 text-[8px]">{w.announcementStatus ?? "Not sent"}</td><td className="px-3 py-2 text-[8px]">{w.paymentStatus}</td></tr>)}</tbody></table></div>}
      </section>

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
              <AdminField label="Official X giveaway post URL" htmlFor="g-post" className="sm:col-span-2"><Input id="g-post" name="xPostUrl" placeholder="https://x.com/buybiz_company/status/..." /></AdminField>
              <label className="flex items-center gap-2 text-[9.5px] text-muted-foreground"><input type="checkbox" name="tasksEnabled" defaultChecked className="h-3.5 w-3.5 accent-foreground" /> Enable social tasks when active</label>
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
            <details className="mt-2 lg:col-span-2">
              <summary className="cursor-pointer list-none text-[9px] font-medium text-muted-foreground underline underline-offset-2 [&::-webkit-details-marker]:hidden">Configure social tasks &amp; dates</summary>
              <div className="mt-2"><AdminActionForm action={updateGiveawaySettingsAction} hidden={{ giveawayId: String(g.id) }} submitLabel="Save giveaway settings" pendingLabel="Saving…" compact>
                <div className="grid gap-2 sm:grid-cols-2"><AdminField label="Title" htmlFor={`edit-title-${g.id}`}><Input id={`edit-title-${g.id}`} name="title" defaultValue={String(g.title)} /></AdminField><AdminField label="Official X giveaway post URL" htmlFor={`edit-post-${g.id}`}><Input id={`edit-post-${g.id}`} name="xPostUrl" defaultValue={g.xPostUrl ? String(g.xPostUrl) : ""} placeholder="https://x.com/..." /></AdminField><AdminField label="Starts at" htmlFor={`edit-start-${g.id}`}><Input id={`edit-start-${g.id}`} name="startsAt" type="datetime-local" defaultValue={g.startsAt ? new Date(String(g.startsAt)).toISOString().slice(0,16) : ""} /></AdminField><AdminField label="Ends at" htmlFor={`edit-end-${g.id}`}><Input id={`edit-end-${g.id}`} name="endsAt" type="datetime-local" defaultValue={g.endsAt ? new Date(String(g.endsAt)).toISOString().slice(0,16) : ""} /></AdminField><AdminField label="Description" htmlFor={`edit-desc-${g.id}`} className="sm:col-span-2"><Textarea id={`edit-desc-${g.id}`} name="description" defaultValue={String(g.description ?? "")} /></AdminField><label className="flex items-center gap-2 text-[9px] text-muted-foreground"><input type="checkbox" name="tasksEnabled" defaultChecked={Boolean(g.tasksEnabled)} className="h-3.5 w-3.5 accent-foreground" /> Enable tasks</label></div>
              </AdminActionForm></div>
            </details>
          </div>
        </section>
      ))}

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Claims</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Payout addresses are visible only in this admin area. Payment signing is not connected.</p></div>
        {data.claims.length === 0 ? <p className="px-4 py-6 text-[10px] text-muted-foreground">No claims yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border bg-surface-subtle/60"><tr>{["Customer", "Entry", "User ID", "Reward", "Network", "Wallet address", "Verification", "Payment", "Claimed"].map((label) => <th key={label} className="px-3 py-2 text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{data.claims.map((c) => <tr key={String(c.id)}><td className="px-3 py-2 text-[10px]">{String(c.username)}<p className="mt-0.5 text-[8px] text-muted-foreground">{String(c.email)}</p></td><td className="px-3 py-2 text-[9px]">{c.isWinner ? `Winner #${String(c.winnerPosition ?? "—")}` : "Participant"}</td><td className="px-3 py-2 font-mono text-[7.5px] text-muted-foreground">{String(c.userId)}</td><td className="px-3 py-2 text-[10px]">{usd(c.rewardCents)}</td><td className="px-3 py-2 text-[8px]">{String(c.network)}</td><td className="max-w-[220px] break-all px-3 py-2 font-mono text-[8px]">{c.walletAddress ? String(c.walletAddress) : "Not submitted"}</td><td className="px-3 py-2 text-[9px] capitalize">{String(c.addressStatus)}</td><td className="px-3 py-2 text-[9px] capitalize">{String(c.paymentStatus)}</td><td className="px-3 py-2 text-[9px] text-muted-foreground">{formatDateTime(new Date(String(c.claimedAt)))}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
