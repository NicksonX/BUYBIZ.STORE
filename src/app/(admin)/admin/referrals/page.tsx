import Link from "next/link";
import { Gift } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/server/auth/guards";
import { getAdminReferrals } from "@/server/data/admin";
import { formatDateTime, formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  await requireAdminPage();
  const { referrals, stats } = await getAdminReferrals();

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Referral rewards"
        description="A reward is credited only after a referred customer makes one verified external deposit of at least ₦3,000. Internal transfers, refunds and admin credits never qualify."
      />

      <div className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        {[
          ["Referrals", stats.total],
          ["Pending", stats.pending],
          ["Rewarded", stats.rewarded],
          ["Rewards credited", formatNaira(stats.paidMinor, { exact: true })],
        ].map(([label, value]) => (
          <div key={label} className="surface-card rounded-[12px] p-3.5">
            <p className="text-[9.5px] text-muted-foreground">{label}</p>
            <p className="tabular mt-2 text-[18px] font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <section className="surface-card mt-3 overflow-hidden rounded-[14px]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[12px] font-semibold">Referral records</h2>
          <Link href="/admin/ledger?type=referral_credit" className="text-[9.5px] text-muted-foreground hover:text-foreground">
            Reward ledger
          </Link>
        </div>
        {referrals.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No referrals yet"
            description="Referral records appear when a customer signs up with another customer's code."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-subtle/60">
                  {["Referrer", "New customer", "Code", "Status", "Reward", "Joined", "Rewarded"].map((label) => (
                    <th key={label} className="px-4 py-2 text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/users?q=${encodeURIComponent(referral.referrerUsername)}`} className="text-[10px] font-medium hover:underline">
                        {referral.referrerUsername}
                      </Link>
                      <p className="mt-0.5 text-[8px] text-muted-foreground">{referral.referrerEmail}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[10px]">{referral.refereeUsername}</td>
                    <td className="px-4 py-2.5 font-mono text-[9px] text-muted-foreground">{referral.code}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={referral.status === "rewarded" ? "success" : referral.status === "pending" ? "warning" : "neutral"}>
                        {referral.status}
                      </Badge>
                    </td>
                    <td className="tabular px-4 py-2.5 text-[10px]">
                      {referral.rewardMinor ? formatNaira(referral.rewardMinor, { exact: true }) : "Not yet"}
                    </td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">{formatDateTime(referral.createdAt)}</td>
                    <td className="px-4 py-2.5 text-[9px] text-muted-foreground">
                      {referral.rewardedAt ? formatDateTime(referral.rewardedAt) : "Not yet"}
                    </td>
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
