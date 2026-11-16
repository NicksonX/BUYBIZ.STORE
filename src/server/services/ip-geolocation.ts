import "server-only";
import geoip from "geoip-lite";
import { countryName } from "@/lib/ai/countries";

export type GeoResolution = {
  countryCode: string | null;
  countryName: string | null;
  source: "ipwho" | "ipinfo" | "local" | "consensus" | null;
  confidence: "high" | "medium" | "low" | "unknown";
  note: string | null;
};

type ProviderResult = { provider: "ipwho" | "ipinfo"; code: string | null };

const cache = new Map<string, { value: GeoResolution; expires: number }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

function normalizeCountry(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return code === "UK" ? "GB" : code;
}

async function lookupIpWho(ip: string): Promise<ProviderResult> {
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json", "User-Agent": "BUYBIZ-geolocation/1.0" },
    });
    if (!response.ok) return { provider: "ipwho", code: null };
    const body = (await response.json()) as { success?: boolean; country_code?: string };
    return { provider: "ipwho", code: body.success === false ? null : normalizeCountry(body.country_code) };
  } catch {
    return { provider: "ipwho", code: null };
  }
}

async function lookupIpInfo(ip: string): Promise<ProviderResult> {
  try {
    const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json", "User-Agent": "BUYBIZ-geolocation/1.0" },
    });
    if (!response.ok) return { provider: "ipinfo", code: null };
    const body = (await response.json()) as { country?: string };
    return { provider: "ipinfo", code: normalizeCountry(body.country) };
  } catch {
    return { provider: "ipinfo", code: null };
  }
}

/**
 * Resolve an IP with two current HTTPS providers, then local GeoIP as a
 * fallback. If the two providers disagree, do not invent a country: return
 * unknown so the admin sees "Country could not be verified" instead of a
 * false mismatch caused by a stale local database.
 */
export async function resolveIpCountry(ip: string): Promise<GeoResolution> {
  const cached = cache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.value;

  const remote = await Promise.all([lookupIpWho(ip), lookupIpInfo(ip)]);
  const valid = remote.filter((item) => item.code);
  const distinct = [...new Set(valid.map((item) => item.code))];
  const local = geoip.lookup(ip)?.country ?? null;
  const localCode = normalizeCountry(local);

  let result: GeoResolution;
  if (distinct.length === 1) {
    const code = distinct[0]!;
    const both = valid.length === 2;
    result = {
      countryCode: code,
      countryName: countryName(code),
      source: both ? "consensus" : valid[0]!.provider,
      confidence: both ? "high" : "medium",
      note: localCode && localCode !== code ? `Local GeoIP was stale (${localCode}); current providers agree on ${code}.` : null,
    };
  } else if (distinct.length > 1) {
    result = {
      countryCode: null,
      countryName: null,
      source: null,
      confidence: "unknown",
      note: `Geolocation providers disagree (${valid.map((item) => `${item.provider}: ${item.code}`).join(", ")}). Country could not be verified.`,
    };
  } else if (localCode) {
    result = {
      countryCode: localCode,
      countryName: countryName(localCode),
      source: "local",
      confidence: "low",
      note: "Live geolocation providers were unavailable; local GeoIP is the only source. Review before saving.",
    };
  } else {
    result = {
      countryCode: null,
      countryName: null,
      source: null,
      confidence: "unknown",
      note: "Country could not be verified.",
    };
  }

  cache.set(ip, { value: result, expires: Date.now() + CACHE_MS });
  return result;
}

export function clearGeoCache() {
  cache.clear();
}
