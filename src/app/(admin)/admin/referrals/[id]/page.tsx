import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Gift, Mail, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/server/auth/guards";
import { getReferrerDetail } from "@/server/data/referral-leaderboard";
import { getAppUrl } from "@/lib/config";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReferrerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const data = await getReferrerDetail(id);
  if (!data.referrer) notFound();
  const link = `${getAppUrl()}/register?ref=${encodeURIComponent(data.referrer.referralCode)}`;
  return <div>
    <Link href="/admin/referrals" className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to leaderboard</Link>
    <div className="mt-3"><PageHeader eyebrow="Referral detail" title={data.referrer.username} description={data.referrer.email} /></div>
    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[["Registered", data.referrer.total], ["Pending", data.referrer.pending], ["Qualified", data.referrer.qualified], ["Earnings", `$${(data.referrer.earningsCents / 100).toFixed(2)}`]].map(([label, value]) => <div key={String(label)} className="surface-card rounded-[12px] p-3.5"><p className="text-[9px] text-muted-foreground">{label}</p><p className="tabular mt-1.5 text-[18px] font-semibold">{value}</p></div>)}</div>
    <section className="surface-card mt-3 rounded-[13px] p-4"><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">Personal referral link</p><p className="mt-2 break-all rounded-[8px] border border-border bg-surface-subtle p-2.5 font-mono text-[9px]">{link}</p><div className="mt-2 flex flex-wrap gap-3 text-[9px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Gift className="h-3 w-3" /> Code {data.referrer.referralCode}</span><span className="font-mono">ID {data.referrer.id}</span></div></section>
    <section className="surface-card mt-3 overflow-hidden rounded-[14px]"><div className="border-b border-border px-4 py-3"><h2 className="text-[12px] font-semibold">Referred customers</h2><p className="mt-1 text-[9px] text-muted-foreground">Registered relationships, deposit evidence, qualifying purchase and reward state.</p></div>{data.referrals.length === 0 ? <p className="p-4 text-[10px] text-muted-foreground">No referrals recorded.</p> : <div className="divide-y divide-border">{data.referrals.map((ref) => <div key={ref.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center"><div><p className="text-[10.5px] font-medium">{ref.refereeUsername}</p><p className="mt-0.5 flex items-center gap-1 text-[8.5px] text-muted-foreground"><Mail className="h-2.5 w-2.5" />{ref.refereeEmail}</p><p className="mt-0.5 font-mono text-[7.5px] text-muted-foreground">{ref.refereeId}</p></div><div className="text-[8.5px] text-muted-foreground"><p>Joined {formatDate(ref.createdAt)}</p><p className="mt-0.5 inline-flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5" />{ref.provider ?? "unknown provider"}</p></div><div className="text-[8.5px]"><p className={ref.hasDeposit ? "text-success" : "text-muted-foreground"}>{ref.hasDeposit ? "Deposit verified" : "No verified deposit"}</p><p className={`mt-0.5 ${ref.hasQualifyingPurchase ? "text-success" : "text-muted-foreground"}`}>{ref.hasQualifyingPurchase ? `Qualifying purchase${ref.qualifyingDurationSeconds ? ` · ${Math.round(ref.qualifyingDurationSeconds / 86400)} days` : ""}` : "No qualifying 7-day+ purchase"}</p></div><div className="text-right"><Badge tone={ref.status === "rewarded" ? "success" : ref.status === "qualified" ? "info" : ref.status === "rejected" ? "danger" : "warning"}>{ref.status}</Badge><p className="mt-1 text-[8px] text-muted-foreground">{ref.rewardCents ? `$${(ref.rewardCents / 100).toFixed(2)} reward` : "Reward not approved"}</p>{ref.rewardedAt ? <p className="mt-0.5 inline-flex items-center gap-1 text-[8px] text-success"><CheckCircle2 className="h-2.5 w-2.5" />{formatDate(ref.rewardedAt)}</p> : <p className="mt-0.5 inline-flex items-center gap-1 text-[8px] text-muted-foreground"><Clock3 className="h-2.5 w-2.5" />Not rewarded</p>}</div></div>)}</div>}</section>
  </div>;
}
