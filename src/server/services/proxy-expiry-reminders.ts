import "server-only";
import { getDb } from "@/lib/db";
import { queueEmail } from "@/server/services/email";
import { formatDateTime } from "@/lib/utils";

export async function runProxyExpiryReminders(now = new Date()) {
  const db = await getDb();
  const enabledResult = await db.query<{ enabled: boolean }>(
    `select (value #>> '{}')::boolean as enabled from app_settings where key='proxy_expiry_reminder_enabled'`,
  );
  const hoursResult = await db.query<{ hours: number }>(
    `select (value #>> '{}')::int as hours from app_settings where key='proxy_expiry_reminder_hours'`,
  );
  if (enabledResult.rows[0]?.enabled === false) return { evaluated: 0, queued: 0 };
  const hours = Math.max(1, Number(hoursResult.rows[0]?.hours ?? 24));

  const candidates = await db.query<{
    allocationId: string;
    userId: string;
    email: string;
    name: string;
    label: string;
    expiresAt: Date;
  }>(
    `select a.id as "allocationId", a.user_id as "userId",
            p.email, coalesce(p.display_name, p.username) as name,
            i.label, a.expires_at as "expiresAt"
       from proxy_allocations a
       join orders o on o.id = a.order_id
       join profiles p on p.id = a.user_id
       join proxy_inventory i on i.id = a.proxy_inventory_id
      where a.status = 'active'
        and o.status = 'completed'
        and p.status = 'active'
        and a.expires_at > $1
        and a.expires_at <= $1 + ($2::int * interval '1 hour')
        and not exists (
          select 1 from proxy_expiry_reminders r where r.allocation_id = a.id
        )`,
    [now, hours],
  );
  let queued = 0;
  for (const row of candidates.rows) {
    const claimed = await db.transaction(async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `insert into proxy_expiry_reminders (allocation_id, user_id)
         values ($1, $2) on conflict (allocation_id) do nothing returning allocation_id as id`,
        [row.allocationId, row.userId],
      );
      if (!inserted.rows[0]) return null;
      const deliveryId = await queueEmail(tx, {
        type: "proxy_expiry_reminder",
        userId: row.userId,
        recipient: row.email,
        data: { name: row.name, expiryLabel: formatDateTime(row.expiresAt), proxyLabel: row.label },
        dedupeKey: `proxy_expiry_reminder:${row.allocationId}`,
      });
      return deliveryId;
    });
    if (claimed) queued += 1;
  }
  return { evaluated: candidates.rows.length, queued };
}
