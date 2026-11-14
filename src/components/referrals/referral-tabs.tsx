import Link from "next/link";

const tabs = [
  { id: "referrals", label: "Referrals", description: "Your code and invited friends" },
  { id: "campaigns", label: "Campaigns", description: "Ambassador and current offers" },
  { id: "rewards", label: "Rewards", description: "USD earnings and payouts" },
] as const;
export type ReferralTab = (typeof tabs)[number]["id"];

export function ReferralTabs({ active }: { active: ReferralTab }) {
  return (
    <nav aria-label="Referral sections" className="surface-card mb-4 grid grid-cols-3 overflow-hidden rounded-[13px] p-1">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <Link key={tab.id} href={`/dashboard/referrals?tab=${tab.id}`} aria-current={selected ? "page" : undefined} className={`rounded-[9px] px-2 py-2.5 text-center transition-colors sm:px-3 ${selected ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
            <span className="block text-[11px] font-semibold">{tab.label}</span>
            <span className={`mt-0.5 hidden text-[8.5px] sm:block ${selected ? "text-background/65" : "text-muted-foreground"}`}>{tab.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}
