import "server-only";
import { getDb } from "@/lib/db";

export type ReferralLeaderFilter = "all" | "pending" | "qualified" | "approved" | "paid";
export type ReferralLeaderRow = {
  id: string; username: string; email: string; referralCode: string; createdAt: Date;
  total: number; pending: number; qualified: number; approved: number; paid: number;
  earningsCents: number;
};
export type ReferralDetail = {
  referrer: ReferralLeaderRow | null;
  referrals: Array<{
    id: string; refereeId: string; refereeEmail: string; refereeUsername: string; provider: string | null;
    status: string; createdAt: Date; rewardedAt: Date | null; rewardCents: number | null;
    hasDeposit: boolean; hasQualifyingPurchase: boolean; qualifyingDurationSeconds: number | null;
  }>;
};

function filterHaving(filter: ReferralLeaderFilter) {
  if (filter === "pending") return "count(r.id) filter (where r.status in ('registered','pending')) > 0";
  if (filter === "qualified") return "count(r.id) filter (where r.status in ('qualified','rewarded')) > 0";
  if (filter === "approved") return "count(r.id) filter (where r.status = 'rewarded') > 0";
  if (filter === "paid") return "coalesce(max(aw.paid_count), 0) > 0";
  return "count(r.id) > 0";
}

export async function getReferralLeaderboard(input: { q?: string; filter?: string; page?: number; pageSize?: number }) {
  const db = await getDb();
  const q = input.q?.trim() ?? "";
  const filter = (["all", "pending", "qualified", "approved", "paid"].includes(input.filter ?? "") ? input.filter : "all") as ReferralLeaderFilter;
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const pageSize = Math.min(50, Math.max(10, Math.floor(Number(input.pageSize) || 25)));
  const term = `%${q.replace(/[%_]/g, "")}%`;
  const where = q
    ? `and (p.email ilike $1 or p.username ilike $1 or p.id::text ilike $1 or p.referral_code ilike $1)`
    : "";
  const params = q ? [term] : [];
  const base = `from profiles p
    left join referrals r on r.referrer_id = p.id
    left join lateral (select sum(amount_usd_cents)::int as total from ambassador_ledger where user_id=p.id and entry_type='commission') earnings on true
    left join lateral (select count(*)::int as paid_count from ambassador_withdrawals where user_id=p.id and status='paid') aw on true
    where p.role='customer' ${where}
    group by p.id, earnings.total, aw.paid_count
    having ${filterHaving(filter)}`;
  const [countResult, rows] = await Promise.all([
    db.query<{ total: number }>(`select count(*)::int as total from (select p.id ${base}) x`, params),
    db.query<ReferralLeaderRow>(
      `select p.id, p.username, p.email, p.referral_code as "referralCode", p.created_at as "createdAt",
              count(r.id)::int as total,
              count(r.id) filter (where r.status in ('registered','pending'))::int as pending,
              count(r.id) filter (where r.status in ('qualified','rewarded'))::int as qualified,
              count(r.id) filter (where r.status = 'rewarded')::int as approved,
              coalesce(aw.paid_count,0)::int as paid,
              coalesce(earnings.total,0)::int as "earningsCents"
       ${base}
       order by count(r.id) desc, p.referral_code asc, p.id asc
       limit $${params.length + 1} offset $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { rows: rows.rows, total: countResult.rows[0]?.total ?? 0, page, pageSize, filter, q };
}

export async function getReferrerDetail(referrerId: string): Promise<ReferralDetail> {
  const db = await getDb();
  const leader = await getReferralLeaderboard({ q: referrerId, pageSize: 10 });
  const referrer = leader.rows.find((row) => row.id === referrerId) ?? null;
  const rows = await db.query<ReferralDetail["referrals"][number]>(
    `select r.id, r.referee_id as "refereeId", p.email as "refereeEmail", p.username as "refereeUsername",
            (select string_agg(distinct i.provider, ', ') from auth.identities i where i.user_id=r.referee_id) as provider,
            r.status, r.created_at as "createdAt", r.rewarded_at as "rewardedAt",
            (select al.amount_usd_cents from ambassador_ledger al where al.referral_id=r.id and al.entry_type='commission' limit 1) as "rewardCents",
            exists(select 1 from deposits d where d.user_id=r.referee_id and d.status='credited') as "hasDeposit",
            (r.qualifying_duration_seconds is not null) as "hasQualifyingPurchase",
            r.qualifying_duration_seconds as "qualifyingDurationSeconds"
       from referrals r join profiles p on p.id=r.referee_id
      where r.referrer_id=$1 order by r.created_at desc limit 200`,
    [referrerId],
  );
  return { referrer, referrals: rows.rows };
}
