import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { getDb } from "@/lib/db";
import { getAppSettings } from "@/server/data/settings";
import { queueEmail, processEmailQueue } from "@/server/services/email";

export const dynamic = "force-dynamic";
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret;
  return isDemoMode() && process.env.NODE_ENV !== "production";
}
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  try {
    const settings = await getAppSettings();
    if (!settings.adminNotificationEmail) return NextResponse.json({ ok: true, sent: 0, message: "No admin notification email configured." });
    const db = await getDb();
    const admin = await db.query<{ id: string }>(`select id from profiles where role='super_admin' order by created_at limit 1`);
    const adminId = admin.rows[0]?.id;
    if (!adminId) return NextResponse.json({ ok: true, sent: 0, message: "No super-admin recipient." });
    const due = await db.query<{ id:string; host:string; country:string|null; interval:number; lastRotatedAt:Date|null; nextRotationAt:Date; active:number }>(
      `select i.id,i.host,i.country_name as country,i.rotation_interval_hours as interval,i.last_rotated_at as "lastRotatedAt",i.next_rotation_at as "nextRotationAt",
              (select count(*)::int from proxy_allocations a where a.proxy_inventory_id=i.id and a.status='active' and a.expires_at>now()) as active
         from proxy_inventory i where i.archived_at is null and i.rotation_interval_hours is not null and i.next_rotation_at is not null and i.next_rotation_at<=now()`,
    );
    let sent = 0;
    for (const row of due.rows) {
      const key = `admin_rotation_reminder:${row.id}:${new Date(row.nextRotationAt).toISOString()}`;
      const id = await db.transaction((tx) => queueEmail(tx, {
        type: "proxy_rotation_reminder",
        userId: adminId,
        recipient: settings.adminNotificationEmail,
        data: { proxyHost: row.host, proxyCountry: row.country ?? "", rotationIntervalLabel: `${row.interval} hours`, lastRotationLabel: row.lastRotatedAt ? new Date(row.lastRotatedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }) : "Never", rotationDueLabel: new Date(row.nextRotationAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" }), activeCustomerCount: row.active, adminActionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.buybiz.store"}/admin/rotation` },
        dedupeKey: key,
      }));
      if (id) sent += 1;
    }
    const queue = await processEmailQueue({ limit: 20 });
    return NextResponse.json({ ok: true, due: due.rows.length, sent, queue }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[buybiz/cron] rotation reminders failed", error);
    return NextResponse.json({ ok: false, message: "Rotation reminder job failed." }, { status: 500 });
  }
}
