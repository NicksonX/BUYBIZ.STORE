import "server-only";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

const NOV16_START = "2026-11-15T23:00:00.000Z";
const NOV17_START = "2026-11-16T23:00:00.000Z";
const SEVEN_DAYS = 604800;

export type TrackerRow = {
  allocationId: string; userId: string; username: string; orderId: string; orderNumber: string;
  purchasedAt: Date; activatedAt: Date; expiresAt: Date; status: string; effectiveStatus: string;
  inventoryId: string; inventoryLabel: string; host: string; port: number; region: string | null;
  countryCode: string | null; accessType: string; maxSeats: number; activeSeats: number;
  upstreamExpiresAt: Date; flagged: boolean; flagReason: string | null; flaggedAt: Date | null;
  replaced: boolean; lastReplacementAt: Date | null; oldInventoryId: string | null; oldHost: string | null;
  oldSharedActiveSeats: number;
};

export async function getProxyTracker(input: { q?: string; status?: string; flagged?: string; replaced?: string; sort?: string }) {
  const db = await getDb();
  const clauses = [
    "o.status='completed'",
    "p.duration_seconds=$1",
    "o.created_at >= $2::timestamptz",
    "o.created_at < $3::timestamptz",
  ];
  const params: (string|number)[] = [SEVEN_DAYS, NOV16_START, NOV17_START];
  if (input.q) { params.push(`%${input.q}%`); clauses.push(`(pr.username ilike $${params.length} or o.order_number ilike $${params.length} or i.host ilike $${params.length})`); }
  if (input.status === "expired") clauses.push(`a.expires_at <= now()`);
  if (input.status === "active") clauses.push(`a.status='active' and a.expires_at > now()`);
  if (input.status === "terminated") clauses.push(`a.status='terminated'`);
  if (input.flagged === "1") clauses.push(`f.id is not null`);
  if (input.replaced === "1") clauses.push(`sw.id is not null`);
  const order = input.sort === "expiry" ? "a.expires_at asc" : input.sort === "ip" ? "i.host asc" : input.sort === "country" ? "i.country_name asc nulls last, i.region asc nulls last" : input.sort === "status" ? "a.status asc, a.expires_at asc" : "o.created_at desc";
  const rows = await db.query<TrackerRow>(
    `select a.id as "allocationId", a.user_id as "userId", pr.username, o.id as "orderId", o.order_number as "orderNumber",
            o.created_at as "purchasedAt", a.activated_at as "activatedAt", a.expires_at as "expiresAt", a.status,
            i.id as "inventoryId", i.label as "inventoryLabel", i.host, i.port, i.region, i.country_code as "countryCode",
            i.access_type as "accessType", i.max_seats as "maxSeats", i.upstream_expires_at as "upstreamExpiresAt",
            coalesce((select count(*)::int from proxy_allocations x where x.proxy_inventory_id=i.id and x.status='active' and x.expires_at>now()),0) as "activeSeats",
            (f.id is not null) as flagged, f.reason as "flagReason", f.flagged_at as "flaggedAt",
            (sw.id is not null) as replaced, sw.switched_at as "lastReplacementAt", sw.from_inventory_id as "oldInventoryId", oldi.host as "oldHost",
            coalesce((select count(*)::int from proxy_allocations x where x.proxy_inventory_id=sw.from_inventory_id and x.status='active' and x.expires_at>now()),0) as "oldSharedActiveSeats"
       from proxy_allocations a
       join profiles pr on pr.id=a.user_id
       join orders o on o.id=a.order_id
       join products p on p.id=a.product_id
       join proxy_inventory i on i.id=a.proxy_inventory_id
       left join proxy_allocation_flags f on f.allocation_id=a.id
       left join lateral (select s.* from proxy_switches s where s.allocation_id=a.id order by s.switched_at desc limit 1) sw on true
       left join proxy_inventory oldi on oldi.id=sw.from_inventory_id
      where ${clauses.join(" and ")}
      order by ${order} limit 300`,
    params,
  );
  return rows.rows.map((row) => ({ ...row, effectiveStatus: row.replaced ? "replaced" : row.status === "active" && new Date(row.expiresAt).getTime() <= Date.now() ? "expired" : row.status }));
}

export async function getReplacementOptions() {
  const db = await getDb();
  const r = await db.query<{ id:string; label:string; host:string; port:number; region:string|null; accessType:string; maxSeats:number; activeSeats:number; upstreamExpiresAt:Date }>(
    `select i.id,i.label,i.host,i.port,i.region,i.access_type as "accessType",i.max_seats as "maxSeats",
            (select count(*)::int from proxy_allocations a where a.proxy_inventory_id=i.id and a.status='active' and a.expires_at>now()) as "activeSeats",
            i.upstream_expires_at as "upstreamExpiresAt"
       from proxy_inventory i join products p on p.slug=i.product_slug
      where i.archived_at is null and i.status in ('available','full') and i.upstream_expires_at>now()
        and p.duration_seconds=$1
        and (select count(*) from proxy_allocations a where a.proxy_inventory_id=i.id and a.status='active' and a.expires_at>now()) < i.max_seats
      order by i.region nulls last, i.label asc limit 100`,
    [SEVEN_DAYS],
  );
  return r.rows;
}

export async function toggleProxyFlag(input: { allocationId: string; adminId: string; flagged: boolean; reason?: string }) {
  const db = await getDb();
  if (input.flagged) {
    await db.query(`insert into proxy_allocation_flags (allocation_id,reason,flagged_by) values ($1,$2,$3) on conflict (allocation_id) do update set reason=excluded.reason, flagged_by=excluded.flagged_by, flagged_at=now()`, [input.allocationId, input.reason?.trim() || "November 16 7-day proxy tracking", input.adminId]);
  } else {
    await db.query(`delete from proxy_allocation_flags where allocation_id=$1`, [input.allocationId]);
  }
  await writeAuditLog(db, { actorUserId: input.adminId, actorRole: "admin", action: input.flagged ? "proxy.flagged" : "proxy.unflagged", entityType: "proxy_allocation", entityId: input.allocationId, metadata: { reason: input.reason ?? null } });
  return { ok: true };
}

export async function replaceExpiredProxy(input: { allocationId: string; inventoryId: string; adminId: string; restoreAccess: boolean; reason?: string }) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const allocation = await tx.query<{ id:string; userId:string; orderId:string; productId:string; inventoryId:string; status:string; activatedAt:Date; expiresAt:Date; duration:number; username:string }>(
      `select a.id,a.user_id as "userId",a.order_id as "orderId",a.product_id as "productId",a.proxy_inventory_id as "inventoryId",a.status,a.activated_at as "activatedAt",a.expires_at as "expiresAt",p.duration_seconds as duration,pr.username
         from proxy_allocations a join products p on p.id=a.product_id join profiles pr on pr.id=a.user_id
        where a.id=$1 for update of a`, [input.allocationId]);
    const a = allocation.rows[0];
    if (!a) throw new AppError("NOT_FOUND", "Allocation not found.");
    if (a.duration !== SEVEN_DAYS) throw new AppError("VALIDATION", "This replacement tool is limited to seven-day allocations.");
    if (a.status !== "expired" && !(a.status === "active" && new Date(a.expiresAt).getTime() <= Date.now())) throw new AppError("CONFLICT", "Only an expired allocation can be replaced here.");
    if (a.inventoryId === input.inventoryId) throw new AppError("CONFLICT", "Choose a different proxy.");
    const target = await tx.query<{ id:string;label:string;host:string;accessType:string;maxSeats:number;upstreamExpiresAt:Date }>(
      `select i.id,i.label,i.host,i.access_type as "accessType",i.max_seats as "maxSeats",i.upstream_expires_at as "upstreamExpiresAt"
         from proxy_inventory i join products p on p.slug=i.product_slug
        where i.id=$1 and i.archived_at is null and i.status in ('available','full') and i.upstream_expires_at>now() and p.duration_seconds=$2
        for update`, [input.inventoryId, SEVEN_DAYS]);
    const t = target.rows[0];
    if (!t) throw new AppError("OUT_OF_STOCK", "That replacement proxy is unavailable or incompatible.");
    const seats = await tx.query<{ n:number }>(`select count(*)::int n from proxy_allocations where proxy_inventory_id=$1 and status='active' and expires_at>now()`, [t.id]);
    if (Number(seats.rows[0]?.n ?? 0) >= t.maxSeats) throw new AppError("PROXY_AT_CAPACITY", "That replacement proxy is full.");
    const now = new Date();
    const newExpiry = input.restoreAccess ? new Date(now.getTime() + SEVEN_DAYS * 1000) : a.expiresAt;
    if (input.restoreAccess) {
      await tx.query(`update proxy_allocations set proxy_inventory_id=$2,status='active',activated_at=$3,expires_at=$4,ended_at=null where id=$1`, [a.id, t.id, now, newExpiry]);
    } else {
      await tx.query(`update proxy_allocations set proxy_inventory_id=$2 where id=$1`, [a.id, t.id]);
    }
    await tx.query(`insert into proxy_switches (allocation_id,user_id,from_inventory_id,to_inventory_id,actor_admin_id,reason,from_status,to_status,previous_expires_at,new_expires_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [a.id,a.userId,a.inventoryId,t.id,input.adminId,input.reason?.trim() || "Admin replacement",a.status,input.restoreAccess?"active":"expired",a.expiresAt,newExpiry]);
    await tx.query(`select public.reconcile_proxy_status()`);
    await writeAuditLog(tx, { actorUserId: input.adminId, actorRole: "admin", action: "proxy.replaced", entityType: "proxy_allocation", entityId: a.id, metadata: { userId:a.userId, orderId:a.orderId, fromInventoryId:a.inventoryId, toInventoryId:t.id, fromIp:a.inventoryId, toIp:t.host, restoreAccess:input.restoreAccess, previousExpiresAt:a.expiresAt.toISOString(), newExpiresAt:newExpiry.toISOString(), reason:input.reason ?? null } });
    if (input.restoreAccess) await notifyUser(tx, { userId:a.userId, type:"allocation", title:"Proxy replaced", body:`Your expired 7-day proxy was replaced. Access is active until ${newExpiry.toISOString()}.`, href:"/dashboard/proxies" });
    return { label:t.label, host:t.host, expiresAt:newExpiry, restoreAccess:input.restoreAccess };
  });
}
