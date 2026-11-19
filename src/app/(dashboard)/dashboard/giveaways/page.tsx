import { Gift } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requireUserPage } from "@/server/auth/guards";
import { listGiveawaysForUser } from "@/server/services/giveaways";
import { GiveawayExperience } from "@/components/giveaways/giveaway-experience";

export const dynamic = "force-dynamic";

export default async function GiveawaysPage() {
  const user = await requireUserPage();
  const giveaways = await listGiveawaysForUser(user.id);
  return (
    <div>
      <PageHeader eyebrow="Community rewards" title="The BUYBIZ giveaway." description="Claim a verified community reward with an official code. Payouts are reviewed and sent manually on BNB Smart Chain." />
      {giveaways.length === 0 ? (
        <section className="surface-card mt-4 rounded-[16px] p-8 text-center"><Gift className="mx-auto h-7 w-7 text-muted-foreground" /><h2 className="mt-3 text-[14px] font-semibold">No giveaways yet</h2><p className="mt-1 text-[10px] text-muted-foreground">Check back soon. Rewards are only real when they appear here.</p></section>
      ) : <div className="mt-4 space-y-4">{giveaways.map((g) => <GiveawayExperience key={g.id} giveaway={g} />)}</div>}
      <p className="mt-4 flex items-center gap-1.5 text-[9px] text-muted-foreground"><Gift className="h-3 w-3" /> Giveaway rewards are separate from referral and campaign rewards. Never share your claim code, private keys or seed phrase.</p>
    </div>
  );
}
