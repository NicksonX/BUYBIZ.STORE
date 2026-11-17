import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminActionForm } from "@/components/admin/action-form";
import { AdminField } from "@/components/admin/field";
import { Input } from "@/components/ui/input";
import { requireAdminPage } from "@/server/auth/guards";
import { getTreasuryOverview, readTreasuryBalance } from "@/server/services/treasury";
import { saveTreasuryWalletAction, attestTreasuryAction, prepareBatchAction, approveBatchAction, recordPaymentAction } from "@/server/actions/treasury";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
function usd(cents: unknown) { return `$${(Number(cents) / 100).toFixed(2)}`; }

export default async function TreasuryPage() {
  const admin = await requireAdminPage();
  const owner = admin.role === "super_admin";
  const data = await getTreasuryOverview();
  const balance = await readTreasuryBalance();
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Finance" title="Treasury Wallet" description="Read-only BSC monitoring and owner-approved manual payment batches. BUYBIZ never stores a seed phrase or private key." />
      {!owner ? <p className="rounded-[9px] border border-warning/20 bg-warning-soft px-3 py-2 text-[10px] text-warning">Only the super-admin treasury owner can configure or approve payments.</p> : null}
      <section className="surface-card rounded-[13px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[12px] font-semibold">Treasury onboarding</h2><p className="mt-1 max-w-2xl text-[9.5px] leading-5 text-muted-foreground">Custody is an external hardware wallet. BUYBIZ stores only the public receiving address. The owner must back up the hardware wallet recovery phrase offline and confirm the attestation below.</p></div><Badge tone={data.wallet?.enabled ? "success" : "warning"}>{data.wallet?.enabled ? "Monitoring enabled" : "Not enabled"}</Badge></div>
        {owner ? <div className="mt-3 grid gap-2 lg:grid-cols-2"><AdminActionForm action={saveTreasuryWalletAction} submitLabel="Save address" pendingLabel="Saving…"><div className="grid gap-2 sm:grid-cols-2"><AdminField label="Label" htmlFor="t-label"><Input id="t-label" name="label" defaultValue={data.wallet?.label ?? "BUYBIZ Treasury"} /></AdminField><AdminField label="BEP20 USDT address" htmlFor="t-address"><Input id="t-address" name="address" required defaultValue={data.wallet?.address ?? ""} placeholder="0x..." className="font-mono text-[10px]" /></AdminField></div></AdminActionForm><div className="flex items-end"><AdminActionForm action={attestTreasuryAction} submitLabel="I confirm recovery is backed up offline · Enable monitoring" pendingLabel="Enabling…" compact variant="outline" /></div></div> : null}
      </section>
      <section className="surface-card rounded-[13px] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-[12px] font-semibold">BSC balance</h2><p className="mt-1 text-[9px] text-muted-foreground">{balance.available ? `Live public RPC · block ${balance.block}` : "Unavailable"}</p></div>{balance.available ? <Badge tone="success">Live</Badge> : <Badge tone="warning">Not available</Badge>}</div>
        {balance.available ? <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-[10px] border border-border bg-surface-subtle p-3"><p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">USDT · BEP20</p><p className="tabular mt-1 text-[20px] font-semibold">{balance.usdt.toFixed(4)}</p></div><div className="rounded-[10px] border border-border bg-surface-subtle p-3"><p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">BNB · gas</p><p className="tabular mt-1 text-[20px] font-semibold">{balance.bnb.toFixed(4)}</p></div></div> : <p className="mt-3 rounded-[8px] border border-warning/20 bg-warning-soft px-3 py-2 text-[9.5px] text-warning">{balance.error}</p>}
        {data.wallet ? <p className="mt-3 break-all font-mono text-[8.5px] text-muted-foreground">{data.wallet.address}</p> : null}
      </section>
      <section className="surface-card rounded-[13px] p-4">
        <h2 className="text-[12px] font-semibold">Giveaway payment batches</h2><p className="mt-1 text-[9px] text-muted-foreground">Prepare a batch, approve it, sign manually in your hardware wallet, then record the confirmed BSC transaction hash. BUYBIZ does not sign.</p>
        <div className="mt-3 space-y-3">
          {data.giveaways.map((g) => <div key={String(g.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] border border-border bg-surface-subtle p-3"><div><p className="text-[10px] font-medium">{String(g.title)}</p><p className="text-[8.5px] text-muted-foreground">{String(g.claimedCount)}/{String(g.claimLimit)} claims</p></div>{owner ? <AdminActionForm action={prepareBatchAction} hidden={{ giveawayId: String(g.id) }} submitLabel="Prepare payment batch" pendingLabel="Preparing…" compact variant="outline" /> : null}</div>)}
          {data.batches.length === 0 ? <p className="text-[9.5px] text-muted-foreground">No batches prepared yet.</p> : data.batches.map((b) => <div key={String(b.id)} className="rounded-[9px] border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-medium">Batch {String(b.id).slice(0, 8)}</p><p className="text-[8.5px] text-muted-foreground">{String(b.itemCount)} payments · {usd(b.totalCents)} · {String(b.status)}</p></div>{owner && b.status === "prepared" ? <AdminActionForm action={approveBatchAction} hidden={{ batchId: String(b.id) }} submitLabel="Approve for signing" pendingLabel="Approving…" compact variant="outline" confirmMessage="Approve this batch for manual hardware-wallet signing?" /> : null}</div><div className="mt-2 space-y-2">{data.items.filter((i) => i.batchId === b.id).map((i) => <div key={String(i.id)} className="rounded-[7px] bg-surface-subtle p-2 text-[9px]"><div className="flex flex-wrap items-center justify-between gap-2"><span>{String(i.username)} · {usd(i.amountCents)} · {String(i.walletAddress)}</span><Badge tone={i.status === "confirmed" ? "success" : "warning"}>{String(i.status)}</Badge></div>{owner && i.status !== "confirmed" ? <AdminActionForm action={recordPaymentAction} hidden={{ itemId: String(i.id) }} submitLabel="Record confirmed hash" pendingLabel="Verifying…" compact variant="subtle"><AdminField label="BSC transaction hash" htmlFor={`tx-${String(i.id)}`}><Input id={`tx-${String(i.id)}`} name="txHash" required placeholder="0x..." className="font-mono text-[9px]" /></AdminField></AdminActionForm> : i.transactionHash ? <p className="mt-1 break-all font-mono text-[8px] text-success">Tx: {String(i.transactionHash)}</p> : null}</div>)}</div></div>)}
        </div>
      </section>
    </div>
  );
}
