import "server-only";
import { getDb } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email/config";
import { getFollowupHours, processEmailQueue, queueEmail } from "@/server/services/email";

export async function runDepositFollowupJobs() {
  if (!isEmailConfigured()) {
    return { queued: 0, skipped: "Email provider is not configured." };
  }
  const hours = await getFollowupHours();
  if (!hours.length) return { queued: 0, skipped: "No follow-up timings configured." };
  const db = await getDb();
  const result = await db.query<{
    userId: string;
    email: string;
    name: string;
    ageHours: number;
  }>(
    `select p.id as "userId", p.email,
            coalesce(p.display_name,p.username) as name,
            floor(extract(epoch from (now()-p.created_at))/3600)::int as "ageHours"
       from profiles p
       join email_preferences e on e.user_id=p.id
      where p.role='customer' and p.email_verified=true
        and e.deposit_reminders_opt_in=true
        and p.status='active'
        and not exists (
          select 1 from wallet_ledger l
           where l.user_id=p.id and l.entry_type='deposit_credit' and l.amount_minor>0
        )
      order by p.created_at asc limit 100`,
  );
  let queued = 0;
  for (const user of result.rows) {
    const eligible = hours
      .map((value, index) => ({ stage: index + 1, hours: value }))
      .filter((item) => user.ageHours >= item.hours);
    if (!eligible.length) continue;
    const stage = eligible[eligible.length - 1];
    const inserted = await db.transaction(async (tx) => {
      const exists = await tx.query(
        `select 1 from email_deliveries
          where dedupe_key=$1 limit 1`,
        [`deposit_followup:${stage.stage}:${user.userId}`],
      );
      if (exists.rows[0]) return null;
      return queueEmail(tx, {
        type: "deposit_followup",
        userId: user.userId,
        recipient: user.email,
        data: { name: user.name },
        dedupeKey: `deposit_followup:${stage.stage}:${user.userId}`,
      });
    });
    if (inserted) queued += 1;
  }
  const processed = await processEmailQueue({ limit: 20 });
  return { queued, processed, hours };
}
