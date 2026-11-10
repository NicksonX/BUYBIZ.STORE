import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Network, ReceiptText, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { AdminNote } from "@/components/admin/field";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminOrderDetail } from "@/server/data/admin";
import { orderStatusMeta } from "@/lib/status";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  const data = await getAdminOrderDetail(id);
  if (!data) notFound();
  const { order, ledger } = data;
  const meta = orderStatusMeta(order.status);

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/admin/orders"
        backLabel="Back to orders"
        eyebrow="Order"
        title={order.productName}
        description={<span className="font-mono text-[11px]">{order.orderNumber}</span>}
        actions={<Badge tone={meta.tone}>{meta.label}</Badge>}
      />

      {order.status === "refunded" ? (
        <div className="rounded-[10px] border border-warning/20 bg-warning-soft px-3.5 py-3 text-[10px] leading-5 text-warning">
          This order was automatically refunded to the customer's BUYBIZ wallet.
          No proxy was allocated. The debit and refund are both in the ledger below.
        </div>
      ) : null}

      <div className="grid items-start gap-3 xl:grid-cols-[1fr_1fr]">
        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Order summary</h2>
          <dl className="mt-3 space-y-2.5 text-[10.5px]">
            <Row label="Customer"><Link href={`/admin/users/${order.userId}`} className="font-medium hover:underline">{order.username}</Link><p className="text-[9px] text-muted-foreground">{order.email}</p></Row>
            <Row label="Amount"><span className="tabular font-semibold">{formatNaira(order.amountMinor, { exact: true })}</span></Row>
            <Row label="Product">{order.productName}</Row>
            <Row label="Status"><Badge tone={meta.tone}>{meta.label}</Badge></Row>
            <Row label="Created">{formatDateTime(order.createdAt)}</Row>
            <Row label="Completed">{order.completedAt ? formatDateTime(order.completedAt) : "Not completed"}</Row>
            {order.failureReason ? <Row label="Failure reason">{order.failureReason}</Row> : null}
          </dl>
        </section>

        <section className="surface-card rounded-[14px] p-4">
          <h2 className="text-[12px] font-semibold">Proxy allocation</h2>
          {order.allocationId ? (
            <div className="mt-3 rounded-[10px] border border-border bg-surface-subtle p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10.5px] font-medium">Allocated</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">
                    Status: {order.allocationStatus} · expires {order.allocationExpiresAt ? formatDateTime(order.allocationExpiresAt) : "unknown"}
                  </p>
                </div>
              </div>
              <AdminNote>
                The customer sees the actual shared connection details in their own dashboard. Admin list responses never include decrypted credentials.
              </AdminNote>
            </div>
          ) : (
            <div className="mt-3 rounded-[10px] border border-border bg-surface-subtle p-3">
              <div className="flex items-center gap-2 text-[10.5px]">
                {order.status === "refunded" ? <RotateCcw className="h-4 w-4 text-warning" /> : <ReceiptText className="h-4 w-4 text-muted-foreground" />}
                {order.status === "refunded" ? "No proxy allocated; amount refunded." : "No allocation record."}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="surface-card overflow-hidden rounded-[14px]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Linked wallet entries</h2>
          <Link href={`/admin/ledger?q=${encodeURIComponent(order.orderNumber)}`} className="text-[9.5px] text-muted-foreground hover:text-foreground">
            Ledger <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-subtle/60">
                {["Type", "Description", "Amount", "Balance after", "Reference", "Date"].map((label) => (
                  <th key={label} className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-2.5 text-[9.5px]">{entry.entryType}</td>
                  <td className="px-4 py-2.5 text-[9.5px]">{entry.description}</td>
                  <td className={`tabular px-4 py-2.5 text-[10px] font-medium ${entry.amountMinor > 0 ? "text-success" : ""}`}>
                    {entry.amountMinor > 0 ? "+" : "−"}{formatNaira(Math.abs(entry.amountMinor), { exact: true })}
                  </td>
                  <td className="tabular px-4 py-2.5 text-[9.5px]">{formatNaira(entry.balanceAfterMinor, { exact: true })}</td>
                  <td className="px-4 py-2.5 font-mono text-[8px] text-muted-foreground">{entry.reference}</td>
                  <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminNote>
        Orders and ledger entries are append-only. If a correction is needed, use a
        wallet adjustment with a reason. Do not edit history in the database.
      </AdminNote>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right font-medium">{children}</dd>
    </div>
  );
}
