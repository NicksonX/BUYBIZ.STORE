"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guards";
import { getDb } from "@/lib/db";
import { encryptOptional, decryptOptional } from "@/lib/security/encryption";
import { writeAuditLog } from "@/server/services/audit";
import { countryName } from "@/lib/ai/countries";
import { parseProxyList, maskPassword, type ParsedProxy } from "@/lib/ai/proxy-parser";
import { verifyProxyBatch, type ProxyVerification } from "@/server/services/proxy-verification";

export type ProxyPreviewRow = {
  lineNumber: number;
  host: string;
  port: number;
  username: string;
  passwordMasked: string;
  protocol: string;
  countryCode: string | null;
  countryName: string | null;
  exitIp: string | null;
  latencyMs: number | null;
  status: string;
  countryStatus: "matched" | "mismatch" | "unverified";
  expectedCountryCode: string;
  expectedCountryName: string;
  source: string | null;
  error: string | null;
  fingerprint: string;
  duplicate: boolean;
};

type StagedProxy = ParsedProxy & { verification: ProxyVerification };

function previewId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function parseAndVerifyProxiesAction(input: {
  countryCode: string;
  protocol: "http" | "https" | "socks4" | "socks5";
  raw: string;
  productSlug: string;
  accessType: "shared" | "single";
  expiryDays: number;
  maxSeats: number;
}) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false as const, message: "Admin access required." };
  }
  const countryCode = String(input.countryCode ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) return { ok: false as const, message: "Choose a proxy country first." };
  const raw = String(input.raw ?? "").trim();
  if (raw.length < 6) return { ok: false as const, message: "Paste at least one proxy entry." };
  if (raw.length > 300_000) return { ok: false as const, message: "Paste fewer than 300,000 characters at a time." };
  const expiryDays = Math.max(1, Math.min(365, Math.round(Number(input.expiryDays) || 30)));
  const requestedSeats = Math.max(1, Math.min(20, Math.round(Number(input.maxSeats) || 20)));
  const maxSeats = input.accessType === "shared" && input.productSlug === "proxy-7-days"
    ? Math.max(20, Math.min(20, requestedSeats))
    : requestedSeats;
  const accessType = input.accessType === "single" ? "single" : "shared";
  if (accessType === "single" && maxSeats !== 1) {
    return { ok: false as const, message: "Single-access proxies must use 1 seat." };
  }

  const db = await getDb();
  const product = await db.query<{ id: string; slug: string }>(
    `select id, slug from products where slug=$1 and category='proxy' and is_active=true limit 1`,
    [input.productSlug],
  );
  if (!product.rows[0]) return { ok: false as const, message: "Choose an active proxy plan." };

  const selectedProtocol = ["http", "https", "socks4", "socks5"].includes(input.protocol)
    ? input.protocol
    : "socks5";
  const parsed = parseProxyList(raw, 300, selectedProtocol);
  const candidates = parsed.parsed;
  if (candidates.length === 0) {
    return { ok: false as const, message: "No valid proxy entries were found. Check the format and try again." };
  }

  const existing = await db.query<{ fingerprint: string }>(
    `select fingerprint from proxy_inventory where fingerprint = any($1::text[])`,
    [candidates.map((item) => item.fingerprint)],
  );
  const existingSet = new Set(existing.rows.map((row) => row.fingerprint));

  const verified = await verifyProxyBatch(candidates, countryCode, 5);
  const rows: ProxyPreviewRow[] = verified.map(({ proxy, verification }) => ({
    lineNumber: proxy.lineNumber,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username ?? "",
    passwordMasked: maskPassword(proxy.password),
    protocol: proxy.protocol,
    countryCode: verification.countryCode,
    countryName: verification.countryName ?? (verification.countryCode ? countryName(verification.countryCode) : null),
    exitIp: verification.exitIp,
    latencyMs: verification.latencyMs,
    status: verification.countryStatus === "unverified" ? "country_unverified" : verification.status,
    countryStatus: verification.countryStatus ?? "unverified",
    expectedCountryCode: countryCode,
    expectedCountryName: countryName(countryCode),
    source: verification.source ?? null,
    error: verification.error,
    fingerprint: proxy.fingerprint,
    duplicate: existingSet.has(proxy.fingerprint),
  }));
  const malformed: ProxyPreviewRow[] = parsed.malformed.map((proxy) => ({
    lineNumber: proxy.lineNumber,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username ?? "",
    passwordMasked: maskPassword(proxy.password),
    protocol: proxy.protocol,
    countryCode: null,
    countryName: null,
    exitIp: null,
    latencyMs: null,
    status: "failed",
    countryStatus: "unverified",
    expectedCountryCode: countryCode,
    expectedCountryName: countryName(countryCode),
    source: null,
    error: proxy.error,
    fingerprint: proxy.fingerprint,
    duplicate: existingSet.has(proxy.fingerprint),
  }));

  const staged: StagedProxy[] = verified.map(({ proxy, verification }) => ({ ...proxy, verification }));
  const encryptedPayload = await encryptOptional(JSON.stringify(staged));
  const batch = await db.query<{ id: string }>(
    `insert into proxy_import_batches
       (created_by, expected_country_code, total_entries, parsed_entries,
        verified_entries, failed_entries, mismatch_entries, duplicate_entries,
        entries, encrypted_payload, settings)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11::jsonb)
     returning id`,
    [
      admin.id,
      countryCode,
      parsed.total,
      parsed.parsed.length,
      rows.filter((row) => row.status === "verified").length,
      rows.filter((row) => row.status === "failed").length,
      rows.filter((row) => row.status === "review_required" || row.status === "country_unverified").length,
      [...rows, ...malformed].filter((row) => row.duplicate).length,
      JSON.stringify([...rows, ...malformed]),
      encryptedPayload,
      JSON.stringify({ productSlug: input.productSlug, accessType, expiryDays, maxSeats }),
    ],
  );
  const batchId = batch.rows[0].id;

  await db.transaction((tx) =>
    writeAuditLog(tx, {
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "proxy_import.parsed",
      entityType: "proxy_import_batch",
      entityId: batchId,
      metadata: { countryCode, parsed: parsed.parsed.length, verified: rows.filter((row) => row.status === "verified").length },
    }),
  ).catch(() => undefined);

  return {
    ok: true as const,
    batchId,
    expectedCountry: countryName(countryCode),
    rows: [...rows, ...malformed],
    summary: {
      total: parsed.total,
      parsed: parsed.parsed.length,
      verified: rows.filter((row) => row.status === "verified").length,
      failed: rows.filter((row) => row.status === "failed").length,
      mismatched: rows.filter((row) => row.status === "review_required").length,
      unverified: rows.filter((row) => row.status === "country_unverified").length,
      duplicates: [...rows, ...malformed].filter((row) => row.duplicate).length,
      malformed: malformed.length,
    },
  };
}

export async function saveVerifiedProxiesAction(batchId: string, allowDuplicate = false) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false as const, message: "Admin access required." };
  }
  const db = await getDb();
  const batch = await db.query<{
    id: string;
    createdBy: string;
    expectedCountryCode: string;
    encryptedPayload: string | null;
    settings: { productSlug?: string; accessType?: "shared" | "single"; expiryDays?: number; maxSeats?: number };
    status: string;
  }>(
    `select id, created_by as "createdBy", expected_country_code as "expectedCountryCode",
            encrypted_payload as "encryptedPayload", settings, status
       from proxy_import_batches where id=$1 and created_by=$2 limit 1`,
    [batchId, admin.id],
  );
  const row = batch.rows[0];
  if (!row || row.status !== "processing") return { ok: false as const, message: "This import is no longer available. Parse the list again." };
  if (!row.encryptedPayload) return { ok: false as const, message: "This import has no staged proxies." };
  const staged = JSON.parse((await decryptOptional(row.encryptedPayload)) ?? "[]") as StagedProxy[];
  const eligible = staged.filter((item) => item.verification.status === "verified");
  if (eligible.length === 0) return { ok: false as const, message: "No verified proxies are ready to save." };

  const settings = row.settings ?? {};
  const expiryDays = Math.max(1, Math.min(365, Number(settings.expiryDays ?? 30)));
  const accessType = settings.accessType === "single" ? "single" : "shared";
  const maxSeats = accessType === "single"
    ? 1
    : settings.productSlug === "proxy-7-days"
      ? 10
      : Math.max(1, Math.min(20, Number(settings.maxSeats ?? 20)));

  let saved = 0;
  let relisted = 0;
  await db.transaction(async (tx) => {
    for (const item of eligible) {
      const existing = await tx.query<{ id: string }>(`select id from proxy_inventory where fingerprint=$1 limit 1`, [item.fingerprint]);
      const isDuplicate = Boolean(existing.rows[0]);
      const fingerprint = isDuplicate && allowDuplicate
        ? `${item.fingerprint}::relist::${batchId}::${item.lineNumber}`
        : item.fingerprint;
      if (isDuplicate && allowDuplicate) relisted += 1;
      const encryptedUsername = await encryptOptional(item.username);
      const encryptedPassword = await encryptOptional(item.password);
      const inserted = await tx.query<{ id: string }>(
        `insert into proxy_inventory
           (label, protocol, host, port, encrypted_username, encrypted_password,
            region, country_code, country_name, exit_ip, verification_status,
            latency_ms, last_verified_at, fingerprint, health_checked_at,
            provider_note, max_seats, access_type, product_slug,
            uploaded_at, upstream_expires_at, expiry_is_estimated, status,
            admin_notes, created_by)
         values ($1,$2::proxy_protocol,$3,$4,$5,$6,$7,$8,$9,$10,'verified',$11,now(),$12,now(),
                 'AI Proxy Assistant',$13,$14,$15,now(),now() + ($16::int * interval '1 day'),
                 true,'available','Imported and verified by AI Proxy Assistant',$17)
         on conflict do nothing
         returning id`,
        [
          `${countryName(row.expectedCountryCode)} · ${item.host}:${item.port}${isDuplicate && allowDuplicate ? " · relist" : ""}`,
          item.protocol,
          item.host,
          item.port,
          encryptedUsername,
          encryptedPassword,
          countryName(row.expectedCountryCode),
          row.expectedCountryCode,
          countryName(row.expectedCountryCode),
          item.verification.exitIp,
          item.verification.latencyMs,
          fingerprint,
          maxSeats,
          accessType,
          settings.productSlug ?? "",
          expiryDays,
          admin.id,
        ],
      );
      if (inserted.rows[0]) {
        saved += 1;
        await tx.query(
          `insert into proxy_verification_logs
             (batch_id, inventory_id, host, port, protocol, status, exit_ip, country_code, latency_ms, error_message)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [batchId, inserted.rows[0].id, item.host, item.port, item.protocol, "verified", item.verification.exitIp, item.verification.countryCode, item.verification.latencyMs, null],
        );
      }
    }
    await tx.query(
      `update proxy_import_batches set saved_entries=$2, status='completed', updated_at=now(), completed_at=now() where id=$1`,
      [batchId, saved],
    );
    await writeAuditLog(tx, {
      actorUserId: admin.id,
      actorRole: admin.role,
      action: "proxy_import.saved",
      entityType: "proxy_import_batch",
      entityId: batchId,
      metadata: { saved, relisted, allowDuplicate, countryCode: row.expectedCountryCode, productSlug: settings.productSlug },
    });
  });
  revalidatePath("/admin/ai-proxy");
  revalidatePath("/admin/inventory");
  revalidatePath("/dashboard/marketplace");
  revalidatePath("/dashboard/checkout/[slug]", "page");
  return { ok: true as const, saved, skipped: eligible.length - saved, relisted };
}
