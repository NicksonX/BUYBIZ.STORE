import "server-only";
import dns from "node:dns/promises";
import https from "node:https";
import geoip from "geoip-lite";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SocksProxyAgent } from "socks-proxy-agent";
import { isIP } from "node:net";
import { countryName } from "@/lib/ai/countries";
import { isPublicIp, type ParsedProxy } from "@/lib/ai/proxy-parser";

export type ProxyVerification = {
  status: "verified" | "failed" | "review_required";
  exitIp: string | null;
  countryCode: string | null;
  countryName: string | null;
  latencyMs: number | null;
  error: string | null;
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
    const agentUrl = `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`;
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
    if (!exitIp || !isIP(exitIp)) {
      return { status: "failed", exitIp: null, countryCode: null, countryName: null, latencyMs: result.latencyMs, error: "Proxy did not return a valid exit IP." };
    }
    const geo = geoip.lookup(exitIp);
    const countryCode = geo?.country ?? null;
    if (!countryCode) {
      return {
        status: "review_required",
        exitIp,
        countryCode: null,
        countryName: null,
        latencyMs: result.latencyMs,
        error: "Exit IP country could not be determined. Review manually.",
      };
    }
    const expected = expectedCountryCode.toUpperCase();
    if (countryCode !== expected) {
      return {
        status: "review_required",
        exitIp,
        countryCode,
        countryName: countryName(countryCode),
        latencyMs: result.latencyMs,
        error: `Country mismatch: expected ${countryName(expected)}, detected ${countryName(countryCode)}.`,
      };
    }
    return {
      status: "verified",
      exitIp,
      countryCode,
      countryName: countryName(countryCode),
      latencyMs: result.latencyMs,
      error: null,
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
