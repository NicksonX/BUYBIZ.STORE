import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

export async function getClientIp() {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return store.get("x-real-ip") || store.get("cf-connecting-ip") || "unknown";
}

export async function getRequestMeta() {
  const store = await headers();
  return {
    ip: await getClientIp(),
    userAgent: store.get("user-agent")?.slice(0, 500) || null,
    forwardedHost: store.get("x-forwarded-host"),
    host: store.get("host"),
  };
}

function digest(value: string) {
  const salt = process.env.RATE_LIMIT_SALT || "buybiz-rate-limit";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export async function rateLimit({
  action,
  identifier,
  limit,
  windowSeconds,
}: {
  action: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; used: number; retryAfterSeconds: number }> {
  const db = await getDb();
  const bucket = `${action}:${digest(identifier)}`;
  const result = await db.query<{
    count: number;
    resetAt: Date;
    blocked: boolean;
  }>(
    `insert into rate_limits (bucket, count, reset_at)
     values ($1, 1, now() + ($2 || ' seconds')::interval)
     on conflict (bucket) do update
       set count = case
             when rate_limits.reset_at <= now() then 1
             else rate_limits.count + 1
           end,
           reset_at = case
             when rate_limits.reset_at <= now() then excluded.reset_at
             else rate_limits.reset_at
           end
     returning count, reset_at as "resetAt", count > $3 as blocked`,
    [bucket, windowSeconds, limit],
  );
  const row = result.rows[0];
  return {
    allowed: !row.blocked,
    used: row.count,
    retryAfterSeconds: Math.max(
      0,
      Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000),
    ),
  };
}

export async function rateLimitByIp(
  action: string,
  limit: number,
  windowSeconds: number,
) {
  const ip = await getClientIp();
  return rateLimit({ action, identifier: ip, limit, windowSeconds });
}
