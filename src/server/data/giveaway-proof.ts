import "server-only";
import { getDb } from "@/lib/db";

export type GiveawayProofRecipient = { username: string; amountCents: number; transactionHash: string; confirmedAt: Date; winnerPosition: number | null };
export async function getGiveawayProof(slug: string) {
  const db = await getDb();
  const giveaway = await db.query<{ id: string; title: string; rewardAsset: string; network: string }>(
    `select id,title,reward_asset as "rewardAsset",network from giveaways where slug=$1 or id::text=$1 limit 1`,
    [slug],
  );
  const g = giveaway.rows[0];
  if (!g) return null;
  const rows = await db.query<GiveawayProofRecipient>(
    `select p.username, i.amount_usd_cents as "amountCents", i.transaction_hash as "transactionHash",
            i.confirmed_at as "confirmedAt", c.winner_position as "winnerPosition"
       from giveaway_payment_items i
       join profiles p on p.id=i.user_id
       join giveaway_claims c on c.id=i.claim_id
      where i.status='confirmed' and i.transaction_hash is not null and c.is_winner=true and i.batch_id in
        (select id from giveaway_payment_batches where giveaway_id=$1)
      order by c.winner_position asc nulls last`,
    [g.id],
  );
  return {
    ...g,
    recipients: rows.rows,
    totalCents: rows.rows.reduce((sum, row) => sum + Number(row.amountCents), 0),
    paidAt: rows.rows.length ? new Date(Math.max(...rows.rows.map((row) => new Date(row.confirmedAt).getTime()))) : null,
  };
}
