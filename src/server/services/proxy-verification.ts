import "server-only";
import dns from "node:dns/promises";
import https from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { isIP } from "node:net";
import { countryName } from "@/lib/ai/countries";
import { isPublicIp, type ParsedProxy } from "@/lib/ai/proxy-parser";
import { resolveIpCountry } from "@/server/services/ip-geolocation";

let serverIpCache: { ip: string; expires: number } | null = null;
async function directServerIp() {
  if (serverIpCache && serverIpCache.expires > Date.now()) return serverIpCache.ip;
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json", "User-Agent": "BUYBIZ-proxy-verifier/1.0" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { ip?: string };
    if (!body.ip) return null;
    serverIpCache = { ip: body.ip, expires: Date.now() + 30 * 60 * 1000 };
    return body.ip;
  } catch {
    return null;
  }
}

export type ProxyVerification = {
  status: "verified" | "failed" | "review_required";
  exitIp: string | null;
  countryCode: string | null;
  countryName: string | null;
  latencyMs: number | null;
  error: string | null;
  source?: string | null;
  countryStatus?: "matched" | "mismatch" | "unverified";
};

async function publicHost(host: string) {
  if (isIP(host)) return isPublicIp(host);
  const records = await dns.lookup(host, { all: true, verbatim: true });
  return records.length > 0 && records.every((record) => !isIP(record.address) || isPublicIp(record.address));
}

function requestThroughProxy(proxy: ParsedProxy, timeoutMs: number) {
  return new Promise<{ body: string; latencyMs: number }>((resolve, reject) => {
    const started = Date.now();
    const auth = proxy.username
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password ?? "")}@`
      : "";
    const proxyHost = isIP(proxy.host) === 6 ? `[${proxy.host}]` : proxy.host;
    const agentUrl = `${proxy.protocol}://${auth}${proxyHost}:${proxy.port}`;
    const agent =
      proxy.protocol === "socks4" || proxy.protocol === "socks5"
        ? new SocksProxyAgent(agentUrl, { timeout: timeoutMs })
        : new HttpsProxyAgent(agentUrl, { timeout: timeoutMs });
    const request = https.request(
      "https://api.ipify.org?format=json",
      {
        agent,
        method: "GET",
        timeout: timeoutMs,
        headers: { Accept: "application/json", "User-Agent": "BUYBIZ-proxy-verifier/1.0" },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
          if (body.length > 4096) request.destroy(new Error("Verification response too large."));
        });
        response.on("end", () => {
          if ((response.statusCode ?? 500) >= 400) {
            reject(new Error(`Proxy check returned HTTP ${response.statusCode}.`));
            return;
          }
          resolve({ body, latencyMs: Date.now() - started });
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("Proxy check timed out.")));
    request.on("error", (error) => reject(error));
    request.end();
  });
}

export async function verifyProxy(
  proxy: ParsedProxy,
  expectedCountryCode: string,
): Promise<ProxyVerification> {
  if (proxy.error) {
    return { status: "failed", exitIp: null, countryCode: null, countryName: null, latencyMs: null, error: proxy.error };
  }
  try {
    if (!(await publicHost(proxy.host))) {
      return { status: "failed", exitIp: null, countryCode: null, countryName: null, latencyMs: null, error: "Proxy host resolves to a private or unsafe address." };
    }
    const result = await requestThroughProxy(proxy, 8_000);
    let exitIp: string | null = null;
    try {
      const parsed = JSON.parse(result.body) as { ip?: string };
      exitIp = parsed.ip?.trim() ?? null;
    } catch {
      exitIp = result.body.trim() || null;
    }
    if (!exitIp || !isIP(exitIp) || !isPublicIp(exitIp)) {
      return { status: "failed", exitIp: null, countryCode: null, countryName: null, latencyMs: result.latencyMs, error: "Proxy did not return a valid public exit IP." };
    }
    const serverIp = await directServerIp();
    if (serverIp && serverIp === exitIp) {
      return {
        status: "failed",
        exitIp,
        countryCode: null,
        countryName: null,
        latencyMs: result.latencyMs,
        error: "Verification did not pass through the proxy (exit IP matches the BUYBIZ server).",
      };
    }
    const geo = await resolveIpCountry(exitIp);
    if (!geo.countryCode) {
      return {
        status: "review_required",
        exitIp,
        countryCode: null,
        countryName: null,
        latencyMs: result.latencyMs,
        error: geo.note ?? "Country could not be verified.",
        source: geo.source,
        countryStatus: "unverified",
      };
    }
    const expected = expectedCountryCode.toUpperCase() === "UK" ? "GB" : expectedCountryCode.toUpperCase();
    if (geo.countryCode !== expected) {
      return {
        status: "review_required",
        exitIp,
        countryCode: geo.countryCode,
        countryName: geo.countryName ?? countryName(geo.countryCode),
        latencyMs: result.latencyMs,
        error: `Country mismatch: expected ${countryName(expected)}, detected ${geo.countryName ?? countryName(geo.countryCode)}. ${geo.note ?? ""}`.trim(),
        source: geo.source,
        countryStatus: "mismatch",
      };
    }
    return {
      status: "verified",
      exitIp,
      countryCode: geo.countryCode,
      countryName: geo.countryName ?? countryName(geo.countryCode),
      latencyMs: result.latencyMs,
      error: geo.note,
      source: geo.source,
      countryStatus: "matched",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy verification failed.";
    return {
      status: "failed",
      exitIp: null,
      countryCode: null,
      countryName: null,
      latencyMs: null,
      error: message.includes("timed out") ? "Connection timed out." : "Connection or authentication failed.",
    };
  }
}

export async function verifyProxyBatch(entries: ParsedProxy[], expectedCountryCode: string, concurrency = 5) {
  const results: Array<{ proxy: ParsedProxy; verification: ProxyVerification }> = [];
  for (let index = 0; index < entries.length; index += concurrency) {
    const batch = entries.slice(index, index + concurrency);
    const verified = await Promise.all(
      batch.map(async (proxy) => ({ proxy, verification: await verifyProxy(proxy, expectedCountryCode) })),
    );
    results.push(...verified);
  }
  return results;
}
