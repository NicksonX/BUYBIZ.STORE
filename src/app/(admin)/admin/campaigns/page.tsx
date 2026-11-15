import Link from "next/link";
import { BadgeDollarSign, Gift, Send, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField, AdminNote } from "@/components/admin/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { campaignPhase, formatCampaignDate, getCampaignAdminData, usd } from "@/server/services/campaigns";
import { reviewCampaignPayoutAction, saveCampaignAction, setCampaignStatusAction } from "@/server/actions/campaign-admin";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function dateInput(date: Date) {
  // Vercel/Supabase timestamps are UTC; campaign dates are Lagos calendar dates.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function tone(status: string) { return status === "paid" ? "success" : status === "rejected" ? "danger" : status === "reserved" ? "info" : "warning"; }
function payoutTone(status: string) { return status === "paid" ? "success" : status === "rejected" ? "danger" : status === "approved" || status === "processing" ? "info" : "warning"; }

function CampaignFields({ campaign }: { campaign?: Awaited<ReturnType<typeof getCampaignAdminData>>["campaigns"][number] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {campaign ? <input type="hidden" name="campaignId" value={campaign.id} /> : null}
      <AdminField label="Name" htmlFor={`name-${campaign?.id ?? "new"}`}><Input id={`name-${campaign?.id ?? "new"}`} name="name" defaultValue={campaign?.name} required /></AdminField>
      <AdminField label="Slug" htmlFor={`slug-${campaign?.id ?? "new"}`}><Input id={`slug-${campaign?.id ?? "new"}`} name="slug" defaultValue={campaign?.slug} required placeholder="campaign-slug" /></AdminField>
      <AdminField label="Status" htmlFor={`status-${campaign?.id ?? "new"}`}><Select id={`status-${campaign?.id ?? "new"}`} name="status" defaultValue={campaign?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option><option value="paused">Paused</option></Select></AdminField>
      <AdminField label="Customer reward (USD)" htmlFor={`customer-${campaign?.id ?? "new"}`}><Input id={`customer-${campaign?.id ?? "new"}`} name="customerRewardUsd" type="number" min={1} step="0.01" defaultValue={campaign ? (campaign.customerRewardCents / 100).toFixed(2) : "10.00"} required /></AdminField>
      <AdminField label="Referrer reward (USD)" htmlFor={`referrer-${campaign?.id ?? "new"}`}><Input id={`referrer-${campaign?.id ?? "new"}`} name="referrerRewardUsd" type="number" min={0} step="0.01" defaultValue={campaign ? (campaign.referrerRewardCents / 100).toFixed(2) : "10.00"} required /></AdminField>
      <AdminField label="Qualifying deposit (NGN, 0 = not required)" htmlFor={`deposit-${campaign?.id ?? "new"}`}><Input id={`deposit-${campaign?.id ?? "new"}`} name="qualifyingDepositNgn" type="number" min={0} step="0.01" defaultValue={campaign ? (campaign.qualifyingDepositMinor / 100).toFixed(2) : "0"} required /></AdminField>
      <AdminField label="Start date" htmlFor={`start-${campaign?.id ?? "new"}`}><Input id={`start-${campaign?.id ?? "new"}`} name="startsAt" type="date" defaultValue={campaign && dateInput(campaign.startsAt)} required /></AdminField>
      <AdminField label="End date" htmlFor={`end-${campaign?.id ?? "new"}`}><Input id={`end-${campaign?.id ?? "new"}`} name="endsAt" type="date" defaultValue={campaign && dateInput(campaign.endsAt)} required /></AdminField>
      <AdminField label="Payout date" htmlFor={`payout-${campaign?.id ?? "new"}`}><Input id={`payout-${campaign?.id ?? "new"}`} name="payoutAt" type="date" defaultValue={campaign && dateInput(campaign.payoutAt)} required /></AdminField>
      <AdminField label="Eligible product slugs" htmlFor={`slugs-${campaign?.id ?? "new"}`} hint="empty = all proxy products" className="sm:col-span-2"><Input id={`slugs-${campaign?.id ?? "new"}`} name="eligibleProductSlugs" defaultValue={campaign?.eligibleProductSlugs.join(", ")} placeholder="proxy-24-hours, proxy-7-days" /></AdminField>
      <AdminField label="Description" htmlFor={`description-${campaign?.id ?? "new"}`} className="sm:col-span-2 lg:col-span-3"><Textarea id={`description-${campaign?.id ?? "new"}`} name="description" defaultValue={campaign?.description} className="min-h-16 text-[10px]" /></AdminField>
      <AdminField label="Terms" htmlFor={`terms-${campaign?.id ?? "new"}`} className="sm:col-span-2 lg:col-span-3"><Textarea id={`terms-${campaign?.id ?? "new"}`} name="terms" defaultValue={campaign?.terms} className="min-h-20 text-[10px]" /></AdminField>
    </div>
  );
}

export default async function AdminCampaignsPage() {
  await requireAdminPage();
  const data = await getCampaignAdminData();
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Finance" title="Campaigns & USD rewards" description="The $10 customer + $10 referrer campaign is separate from the $3 Ambassador ledger and the NGN wallet. Rewards are server-evaluated and payouts are manual, audited USDT BEP20 transfers." />
      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard label="Campaign liability" value={usd(data.totals.totalCents)} icon={Gift} hint="All current rewards" />
        <StatCard label="Customer rewards" value={usd(data.totals.customerCents)} icon={Users} hint="Qualifying customers" />
        <StatCard label="Referrer rewards" value={usd(data.totals.referrerCents)} icon={BadgeDollarSign} hint="Qualifying referrers" />
        <StatCard label="Paid out" value={usd(data.totals.paidCents)} icon={Send} hint={`${usd(data.totals.pendingCents)} pending`} />
      </div>
      <AdminNote tone="info">Do not mark a payout paid until the actual USDT BEP20 transfer is complete and the transaction hash is recorded. Customer and referrer rewards are separate rows.</AdminNote>

      {data.campaigns.map((campaign) => {
        const phase = campaignPhase(campaign);
        return (
          <section key={campaign.id} className="surface-card overflow-hidden rounded-[13px]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-[12px] font-semibold">{campaign.name}</h2><Badge tone={phase === "active" ? "success" : phase === "ended" ? "neutral" : "warning"}>{phase}</Badge></div><p className="mt-1 text-[9px] text-muted-foreground">{formatCampaignDate(campaign.startsAt)} – {formatCampaignDate(campaign.endsAt)} · payout {formatCampaignDate(campaign.payoutAt)}</p></div>
              <div className="flex flex-wrap gap-2"><Link href={`/campaigns/${campaign.slug}`} className="inline-flex h-7 items-center rounded-full border border-border px-3 text-[9px] font-medium hover:bg-accent">Preview</Link>{campaign.status === "published" ? <AdminActionForm action={setCampaignStatusAction} hidden={{ campaignId: campaign.id, status: "draft" }} submitLabel="Unpublish" pendingLabel="Updating…" variant="subtle" compact confirmMessage="Unpublish this campaign? Existing rewards stay recorded." /> : <AdminActionForm action={setCampaignStatusAction} hidden={{ campaignId: campaign.id, status: "published" }} submitLabel="Publish" pendingLabel="Publishing…" variant="outline" compact />}</div>
            </div>
            <details className="px-4 py-3"><summary className="cursor-pointer list-none text-[10.5px] font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">Edit campaign settings</summary><div className="mt-3"><AdminActionForm action={saveCampaignAction} submitLabel="Save campaign" pendingLabel="Saving…"><CampaignFields campaign={campaign} /></AdminActionForm></div></details>
          </section>
        );
      })}

      <details className="surface-card rounded-[13px] p-4"><summary className="cursor-pointer list-none text-[11px] font-semibold [&::-webkit-details-marker]:hidden">Create another campaign</summary><div className="mt-3"><AdminActionForm action={saveCampaignAction} submitLabel="Create campaign" pendingLabel="Creating…"><CampaignFields /></AdminActionForm></div></details>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Qualifying rewards</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Customer and referrer rows are separate, with deposit and order evidence retained.</p></div>
        {data.rewards.length === 0 ? <p className="px-4 py-7 text-center text-[10px] text-muted-foreground">No qualifying campaign rewards yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="border-b border-border bg-surface-subtle/60"><tr>{["Customer", "Referrer", "Role", "Amount", "Status", "Evidence", "Earned"].map((label) => <th key={label} className="px-4 py-2 text-[8.5px] uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{data.rewards.map((reward) => <tr key={reward.id}><td className="px-4 py-2.5 text-[10px]">{reward.customerUsername}</td><td className="px-4 py-2.5 text-[10px]">{reward.referrerUsername ?? "No referrer"}</td><td className="px-4 py-2.5"><Badge tone={reward.role === "customer" ? "info" : "success"}>{reward.role}</Badge></td><td className="tabular px-4 py-2.5 text-[10px]">{usd(reward.amountCents)}</td><td className="px-4 py-2.5"><Badge tone={tone(reward.status)}>{reward.status}</Badge></td><td className="px-4 py-2.5 text-[8px] text-muted-foreground">Deposit {reward.depositId.slice(0, 8)}…<br />Order {reward.orderId.slice(0, 8)}…</td><td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(reward.earnedAt)}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="surface-card overflow-hidden rounded-[13px]">
        <div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Campaign payout requests</h2><p className="mt-0.5 text-[9px] text-muted-foreground">Approve, process, reject, or record the real BEP20 transaction hash. No auto-payment.</p></div>
        {data.payouts.length === 0 ? <p className="px-4 py-7 text-center text-[10px] text-muted-foreground">No campaign payout requests yet.</p> : <div className="divide-y divide-border">{data.payouts.map((payout) => <div key={payout.id} className="px-4 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-semibold">{payout.username}</p><p className="text-[9px] text-muted-foreground">{payout.email}</p></div><div className="flex items-center gap-2"><span className="tabular text-[14px] font-semibold">{usd(payout.amountCents)}</span><Badge tone={payoutTone(payout.status)}>{payout.status.replaceAll("_", " ")}</Badge></div></div><div className="mt-2 grid gap-2 text-[9px] sm:grid-cols-3"><div><span className="text-muted-foreground">Wallet</span><p className="mt-0.5 break-all font-mono text-[8px]">{payout.walletAddress}</p></div><div><span className="text-muted-foreground">Requested</span><p className="mt-0.5">{formatDateTime(payout.requestedAt)}</p></div><div><span className="text-muted-foreground">Transaction hash</span><p className="mt-0.5 break-all font-mono text-[8px]">{payout.transactionHash ?? "Not recorded"}</p></div></div>{payout.rejectionReason ? <p className="mt-2 text-[9px] text-danger">Reason: {payout.rejectionReason}</p> : null}{!["paid", "rejected"].includes(payout.status) ? <div className="mt-3 flex flex-wrap gap-2">{payout.status === "pending_review" ? <AdminActionForm action={reviewCampaignPayoutAction} hidden={{ payoutId: payout.id, decision: "approve" }} submitLabel="Approve" pendingLabel="Approving…" variant="outline" compact confirmMessage="Approve this campaign payout?" /> : null}{payout.status === "approved" ? <AdminActionForm action={reviewCampaignPayoutAction} hidden={{ payoutId: payout.id, decision: "processing" }} submitLabel="Mark processing" pendingLabel="Updating…" variant="outline" compact /> : null}{["approved", "processing"].includes(payout.status) ? <AdminActionForm action={reviewCampaignPayoutAction} hidden={{ payoutId: payout.id, decision: "paid" }} submitLabel="Mark paid" pendingLabel="Recording…" variant="outline" compact confirmMessage="Only continue after the USDT transfer is complete."><AdminField label="BEP20 transaction hash" htmlFor={`tx-${payout.id}`}><Input id={`tx-${payout.id}`} name="transactionHash" required placeholder="0x..." /></AdminField></AdminActionForm> : null}<AdminActionForm action={reviewCampaignPayoutAction} hidden={{ payoutId: payout.id, decision: "reject" }} submitLabel="Reject" pendingLabel="Rejecting…" variant="danger" compact confirmMessage="Reject and release the reserved rewards?"><AdminField label="Reason" htmlFor={`reason-${payout.id}`}><Textarea id={`reason-${payout.id}`} name="reason" required minLength={5} className="min-h-16 text-[10px]" /></AdminField></AdminActionForm></div> : null}</div>)}</div>}
      </section>
    </div>
  );
}
