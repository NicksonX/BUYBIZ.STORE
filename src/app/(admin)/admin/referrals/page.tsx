import Link from "next/link";
import { ArrowUpRight, Gift, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/server/auth/guards";
import { getReferralLeaderboard } from "@/server/data/referral-leaderboard";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
const filters = [
  ["all", "All"], ["pending", "Pending"], ["qualified", "Qualified"], ["approved", "Approved"], ["paid", "Paid"],
] as const;

export default async function AdminReferralsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const params = await searchParams;
  const q = first(params.q) ?? "";
  const filter = first(params.filter) ?? "all";
  const page = Number(first(params.page) ?? 1) || 1;
  const data = await getReferralLeaderboard({ q, filter, page, pageSize: 25 });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const pageHref = (next: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (filter !== "all") query.set("filter", filter);
    query.set("page", String(next));
    return `/admin/referrals?${query.toString()}`;
  };

  return (
    <div>
      <PageHeader eyebrow="Finance" title="Referral leaderboard" description="Ranked by verified registered referral relationships. Registration is separate from a qualified reward; a reward requires the referred customer's qualifying deposit and 7-day+ proxy purchase." />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[["Referrers", data.total], ["Page", `${data.page} / ${totalPages}`], ["Registered referrals", data.rows.reduce((n, r) => n + r.total, 0)], ["Total earnings on page", `$${(data.rows.reduce((n, r) => n + r.earningsCents, 0) / 100).toFixed(2)}`]].map(([label, value]) => (
          <div key={String(label)} className="surface-card rounded-[12px] p-3.5"><p className="text-[9.5px] text-muted-foreground">{label}</p><p className="tabular mt-2 text-[18px] font-semibold">{value}</p></div>
        ))}
      </div>
      <form method="get" className="surface-card mt-3 flex flex-wrap items-center gap-2 rounded-[12px] p-3">
        <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={q} placeholder="Search email, username, user ID or referral code" className="h-9 pl-8 text-[11px]" /></div>
        <select name="filter" defaultValue={filter} className="h-9 rounded-full border border-border bg-surface px-3 text-[10px]" aria-label="Referral status filter">{filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button type="submit" className="h-9 rounded-full bg-foreground px-4 text-[10.5px] font-semibold text-background">Apply</button>
        <Link href="/admin/referrals" className="inline-flex h-9 items-center rounded-full border border-border px-3 text-[10px] text-muted-foreground">Reset</Link>
      </form>
      <p className="mt-2 text-[9px] text-muted-foreground">Ranking: registered referrals descending, then referral code ascending as the deterministic tie-breaker.</p>
      <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
        {data.rows.length === 0 ? <EmptyState icon={Gift} title="No referrers match" description="Try another search or remove the status filter." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left">
              <thead><tr className="border-b border-border bg-surface-subtle/60">{["Rank", "Customer", "User ID", "Code", "Registered", "Pending", "Qualified", "Approved", "Paid payouts", "Earnings", "Joined"].map((label) => <th key={label} className="px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((row, index) => <tr key={row.id} className="hover:bg-surface-subtle/50">
                  <td className="px-3 py-2.5"><span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-subtle px-1.5 text-[9px] font-semibold">{(data.page - 1) * data.pageSize + index + 1}</span></td>
                  <td className="px-3 py-2.5"><Link href={`/admin/referrals/${row.id}`} className="text-[10.5px] font-medium hover:underline">{row.username}</Link><p className="mt-0.5 text-[8.5px] text-muted-foreground">{row.email}</p></td>
                  <td className="px-3 py-2.5 font-mono text-[8px] text-muted-foreground">{row.id}</td>
                  <td className="px-3 py-2.5 font-mono text-[9px]">{row.referralCode}</td>
                  <td className="tabular px-3 py-2.5 text-[10px] font-semibold">{row.total}</td>
                  <td className="tabular px-3 py-2.5 text-[10px]">{row.pending}</td>
                  <td className="tabular px-3 py-2.5 text-[10px]">{row.qualified}</td>
                  <td className="tabular px-3 py-2.5 text-[10px]">{row.approved}</td>
                  <td className="tabular px-3 py-2.5 text-[10px]">{row.paid}</td>
                  <td className="tabular px-3 py-2.5 text-[10px]">${(row.earningsCents / 100).toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-[8.5px] text-muted-foreground">{formatDate(row.createdAt)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {totalPages > 1 ? <div className="mt-3 flex items-center justify-between"><Link href={pageHref(Math.max(1, page - 1))} className="rounded-full border border-border px-3 py-1.5 text-[9.5px]">Previous</Link><span className="text-[9.5px] text-muted-foreground">Page {data.page} of {totalPages}</span><Link href={pageHref(Math.min(totalPages, page + 1))} className="rounded-full border border-border px-3 py-1.5 text-[9.5px]">Next</Link></div> : null}
      <div className="mt-4 flex items-center justify-between rounded-[10px] border border-border bg-surface-subtle p-3 text-[9px] text-muted-foreground"><span>Normal referrals are separate from promotional campaign rewards.</span><Link href="/admin/campaigns" className="inline-flex items-center gap-1 font-medium text-foreground">Campaign rewards <ArrowUpRight className="h-3 w-3" /></Link></div>
    </div>
  );
}
