import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, CreditCard, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/server/auth/guards";
import { getDb } from "@/lib/db";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  await requireAdminPage();
  const db = await getDb();
  const [status, mismatch, duplicates, recent] = await Promise.all([
    db.query<{ status: string; n: number; total: string; fees: string }>(
      `select status,count(*)::int n,coalesce(sum(amount_minor),0)::bigint total,coalesce(sum(gateway_fee_minor),0)::bigint fees from deposits group by status order by status`,
    ),
    db.query<{ n: number }>(
      `select count(*)::int n from deposits d where d.status='credited' and not exists (select 1 from wallet_ledger l where l.related_deposit_id=d.id and l.entry_type='deposit_credit')`,
    ),
    db.query<{ n: number }>(
      `select count(*)::int n from (select related_deposit_id from wallet_ledger where entry_type='deposit_credit' and related_deposit_id is not null group by related_deposit_id having count(*)>1) x`,
    ),
    db.query<{ id: string; reference: string; amount: string; status: string; email: string; createdAt: Date }>(
      `select d.id,d.provider_reference as reference,d.amount_minor::text amount,d.status,p.email,d.created_at as "createdAt" from deposits d join profiles p on p.id=d.user_id where d.status in ('pending','failed') order by d.created_at desc limit 12`,
    ),
  ]);
  const map = new Map(status.rows.map((row) => [row.status, row]));
  const credited = map.get("credited");
  const totalCredits = Number(credited?.total ?? 0);
  const totalFees = Number(credited?.fees ?? 0);
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Deposit reconciliation" description="Read-only reconciliation between BUYBIZ deposit records and wallet ledger. This page never changes payment status or customer balances." />
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Wallet credits issued" value={formatNaira(totalCredits)} detail={`${credited?.n ?? 0} credited deposits`} icon={<CreditCard className="h-4 w-4" />} />
        <Card label="Recorded Paystack fees" value={formatNaira(totalFees)} detail="Gateway fees on credited deposits" icon={<Scale className="h-4 w-4" />} />
        <Card label="Pending deposits" value={String(map.get("pending")?.n ?? 0)} detail={formatNaira(Number(map.get("pending")?.total ?? 0))} icon={<AlertTriangle className="h-4 w-4" />} />
        <Card label="Credited without ledger" value={String(mismatch.rows[0]?.n ?? 0)} detail="Must always be zero" icon={mismatch.rows[0]?.n ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <section className="surface-card rounded-[13px] p-4">
          <h2 className="text-[12px] font-semibold">Local status summary</h2>
          <p className="mt-1 text-[9px] text-muted-foreground">These are recorded BUYBIZ totals, not Paystack gross settlement or refunds.</p>
          <div className="mt-3 divide-y divide-border">
            {status.rows.map((row) => <div key={row.status} className="flex items-center justify-between py-2 text-[10px]"><span className="capitalize">{row.status}</span><span className="tabular">{row.n} · {formatNaira(Number(row.total))}</span></div>)}
          </div>
          <div className={`mt-3 rounded-[8px] p-2 text-[9px] ${duplicates.rows[0]?.n ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}>{duplicates.rows[0]?.n ? `${duplicates.rows[0].n} deposits have duplicate ledger credits.` : "No duplicate deposit credits found."}</div>
        </section>
        <section className="surface-card overflow-hidden rounded-[13px]">
          <div className="border-b border-border p-4"><h2 className="text-[12px] font-semibold">Pending and failed records needing review</h2><p className="mt-1 text-[9px] text-muted-foreground">Read-only. Verify each against Paystack before any correction.</p></div>
          <div className="divide-y divide-border">
            {recent.rows.length ? recent.rows.map((row) => <Link key={row.id} href={`/admin/deposits?q=${encodeURIComponent(row.reference)}`} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[9.5px] hover:bg-surface-subtle"><div className="min-w-0"><p className="truncate font-mono text-[8.5px]">{row.reference}</p><p className="mt-0.5 truncate text-muted-foreground">{row.email}</p></div><div className="flex shrink-0 items-center gap-2"><span>{formatNaira(Number(row.amount))}</span><Badge tone={row.status === "failed" ? "danger" : "warning"}>{row.status}</Badge><ArrowUpRight className="h-3 w-3" /></div></Link>) : <p className="p-4 text-[9.5px] text-muted-foreground">No pending or failed records.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
function Card({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <div className="surface-card rounded-[12px] p-3.5"><div className="flex items-center justify-between"><p className="text-[9px] text-muted-foreground">{label}</p>{icon}</div><p className="tabular mt-1.5 text-[18px] font-semibold">{value}</p><p className="mt-0.5 text-[8px] text-muted-foreground">{detail}</p></div>;
}
