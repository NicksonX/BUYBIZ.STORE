import "server-only";
import { getDb } from "@/lib/db";
import { getAmbassadorConfig } from "@/server/services/ambassador";

export async function getAmbassadorPayouts() {
  const db = await getDb();
  const config = await getAmbassadorConfig();
  const [withdrawals, addresses, stats, ambassadors] = await Promise.all([
    db.query<{
      id: string;
      userId: string;
      username: string;
      email: string;
      amountCents: number;
      status: string;
      walletAddress: string;
      network: string;
      transactionHash: string | null;
      rejectionReason: string | null;
      adminNote: string | null;
      requestedAt: Date;
      approvedAt: Date | null;
      paidAt: Date | null;
      rejectedAt: Date | null;
    }>(
      `select w.id, w.user_id as "userId", p.username, p.email,
              w.amount_usd_cents as "amountCents", w.status,
              w.wallet_address as "walletAddress", w.network,
              w.transaction_hash as "transactionHash",
              w.rejection_reason as "rejectionReason",
              w.admin_note as "adminNote",
              w.requested_at as "requestedAt", w.approved_at as "approvedAt",
              w.paid_at as "paidAt", w.rejected_at as "rejectedAt"
         from ambassador_withdrawals w
         join profiles p on p.id=w.user_id
        order by
          case w.status when 'pending' then 0 when 'processing' then 1
            when 'paid' then 2 else 3 end,
          w.requested_at desc
        limit 200`,
    ),
    db.query<{
      id: string;
      userId: string;
      username: string;
      email: string;
      address: string;
      status: string;
      createdAt: Date;
    }>(
      `select a.id, a.user_id as "userId", p.username, p.email,
              a.address, a.status, a.created_at as "createdAt"
         from ambassador_wallet_addresses a
         join profiles p on p.id=a.user_id
        where a.status='pending'
        order by a.created_at asc limit 100`,
    ),
    db.query<{
      ambassadors: number;
      pendingCount: number;
      pendingCents: number;
      paidCents: number;
      availableCents: number;
    }>(
      `select
         (select count(*)::int from ambassador_profiles) as ambassadors,
         (select count(*)::int from ambassador_withdrawals where status in ('pending','processing')) as "pendingCount",
         coalesce((select sum(amount_usd_cents) from ambassador_withdrawals where status in ('pending','processing')),0)::int as "pendingCents",
         coalesce((select sum(amount_usd_cents) from ambassador_withdrawals where status='paid'),0)::int as "paidCents",
         coalesce((select sum(amount_usd_cents) from ambassador_ledger),0)::int as "availableCents"`,
    ),
    db.query<{
      userId: string;
      username: string;
      email: string;
      promotedAt: Date;
      qualified: number;
      earnedCents: number;
    }>(
      `select a.user_id as "userId", p.username, p.email,
              a.promoted_at as "promotedAt",
              (select count(*)::int from referrals r where r.referrer_id=a.user_id and r.ambassador_qualified_at is not null) as qualified,
              coalesce((select sum(c.amount_usd_cents) from ambassador_commissions c where c.ambassador_id=a.user_id and c.status='available'),0)::int as "earnedCents"
         from ambassador_profiles a join profiles p on p.id=a.user_id
        order by a.promoted_at desc limit 50`,
    ),
  ]);
  return {
    config,
    withdrawals: withdrawals.rows,
    addresses: addresses.rows,
    stats: {
      ambassadors: Number(stats.rows[0]?.ambassadors ?? 0),
      pendingCount: Number(stats.rows[0]?.pendingCount ?? 0),
      pendingCents: Number(stats.rows[0]?.pendingCents ?? 0),
      paidCents: Number(stats.rows[0]?.paidCents ?? 0),
      availableCents: Number(stats.rows[0]?.availableCents ?? 0),
    },
    ambassadors: ambassadors.rows,
  };
}
