import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { AdminActionForm } from "@/components/admin/action-form";
import { OkxPayoutSigner } from "@/components/admin/okx-payout-signer";
import { requireAdminPage } from "@/server/auth/guards";
import { getTreasuryOverview } from "@/server/services/treasury";
import { approveBatchAction, prepareBatchAction } from "@/server/actions/treasury";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
const usd = (cents: unknown) => `$${(Number(cents) / 100).toFixed(2)}`;

export default async function GiveawayPayoutsPage() {
  const admin = await requireAdminPage();
  const data = await getTreasuryOverview();
  const latest = data.batches[0];
  const batchItems = latest ? data.items.filter((i) => i.batchId === latest.id) : [];
  const owner = admin.role === "super_admin";
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Finance" title="Giveaway payouts" description="Verify winners, approve the batch, then sign each USDT BEP20 transfer in OKX Wallet. BUYBIZ verifies each confirmed BSC transaction before marking a winner paid." actions={<Link href="/admin/giveaways" className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-[10px] font-medium">Giveaway admin</Link>} />
      {!latest ? <section className="surface-card rounded-[12px] p-4"><p className="text-[10px] text-muted-foreground">No payout batch has been prepared.</p>{owner ? <div className="mt-3"><AdminActionForm action={prepareBatchAction} hidden={{ giveawayId: String(data.giveaways[0]?.id ?? "") }} submitLabel="Prepare winner batch" pendingLabel="Preparing…" compact variant="outline" /></div> : null}</section> : <>
        <section className="surface-card rounded-[12px] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[8.5px] uppercase tracking-[0.1em] text-muted-foreground">Batch {String(latest.id).slice(0, 8)}</p><p className="mt-1 text-[13px] font-semibold">{String(latest.itemCount)} payments · {usd(latest.totalCents)} USDT</p><p className="mt-1 text-[9px] text-muted-foreground">Created {latest.createdAt ? formatDateTime(new Date(String(latest.createdAt))) : "—"} · Status {String(latest.status)}</p></div><Badge tone={latest.status === "approved" ? "success" : latest.status === "prepared" ? "warning" : "neutral"}>{String(latest.status)}</Badge></div>{latest.status === "prepared" && owner ? <div className="mt-3"><AdminActionForm action={approveBatchAction} hidden={{ batchId: String(latest.id) }} submitLabel="Approve batch for OKX signing" pendingLabel="Approving…" variant="outline" compact confirmMessage="Approve this winner payout batch for signing? This records approval but does not send funds." /></div> : null}</section>
        <section className="surface-card rounded-[12px] p-4"><h2 className="text-[11px] font-semibold">OKX Wallet transaction signing</h2><p className="mt-1 text-[9px] leading-4 text-muted-foreground">Each winner requires one OKX approval. The browser signs; the private key never reaches BUYBIZ. The backend checks the USDT contract, recipient and amount from the confirmed BSC receipt.</p><div className="mt-3"><OkxPayoutSigner batchStatus={String(latest.status)} items={batchItems.map((i) => ({ id: String(i.id), username: String(i.username), walletAddress: String(i.walletAddress), amountCents: Number(i.amountCents), status: String(i.status), transactionHash: i.transactionHash ? String(i.transactionHash) : null }))} /></div></section>
      </>}
    </div>
  );
}
