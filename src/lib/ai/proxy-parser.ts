import { createHash } from "node:crypto";
import { isIP } from "node:net";

export type ProxyProtocol = "http" | "https" | "socks4" | "socks5";
export type ParsedProxy = {
  lineNumber: number;
  raw: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  protocol: ProxyProtocol;
  fingerprint: string;
  error: string | null;
};

const PRIVATE_V4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
];
const PRIVATE_V6 = /^(::1|fc|fd|fe80|::ffff:127\.)/i;

export function isPublicIp(ip: string) {
  const version = isIP(ip);
  if (!version) return false;
  return version === 4 ? !PRIVATE_V4.some((pattern) => pattern.test(ip)) : !PRIVATE_V6.test(ip);
}

export function isPublicHostname(host: string) {
  const clean = host.trim().toLowerCase();
  if (!clean || /\s/.test(clean)) return false;
  if (isIP(clean)) return isPublicIp(clean);
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(clean);
}

function splitAlternative(line: string) {
  if (line.includes("|")) return line.split("|").map((part) => part.trim());
  if (line.includes("\t")) return line.split("\t").map((part) => part.trim());
  if (line.includes(";")) return line.split(";").map((part) => part.trim());
  return null;
}

function fingerprint(protocol: string, host: string, port: number, username: string | null) {
  return createHash("sha256")
    .update(`${protocol}|${host.toLowerCase()}|${port}|${username ?? ""}`)
    .digest("hex");
}

export function parseProxyLine(
  rawLine: string,
  lineNumber: number,
  defaultProtocol: ProxyProtocol = "http",
): ParsedProxy | null {
  const raw = rawLine.trim();
  if (!raw || raw.startsWith("#")) return null;

  let protocol: ProxyProtocol = defaultProtocol;
  let line = raw;
  const scheme = line.match(/^(https?|socks4|socks5):\/\//i);
  if (scheme) {
    protocol = scheme[1].toLowerCase() as ProxyProtocol;
    line = line.slice(scheme[0].length);
  }

  let host = "";
  let port = 0;
  let username: string | null = null;
  let password: string | null = null;
  let error: string | null = null;

  try {
    if (line.includes("@")) {
      // user:pass@host:port (or scheme://user:pass@host:port)
      const url = new URL(`${protocol}://${line}`);
      host = url.hostname;
      port = url.port ? Number(url.port) : protocol === "https" ? 443 : 80;
      username = url.username ? decodeURIComponent(url.username) : null;
      password = url.password ? decodeURIComponent(url.password) : null;
    } else {
      const alternative = splitAlternative(line);
      if (alternative) {
        if (alternative.length === 4) {
          host = alternative[0];
          port = Number(alternative[1]);
          username = alternative[2] || null;
          password = alternative[3] || null;
        } else if (alternative.length === 2) {
          host = alternative[0];
          port = Number(alternative[1]);
        } else {
          error = "Expected host, port and optional username/password.";
        }
      } else {
        const parts = line.split(":");
        if (parts.length === 2) {
          host = parts[0];
          port = Number(parts[1]);
        } else if (parts.length >= 4) {
          // host:port:username:password — password may itself contain a colon.
          host = parts[0];
          port = Number(parts[1]);
          username = parts[2] || null;
          password = parts.slice(3).join(":") || null;
        } else {
          error = "Expected host:port or host:port:username:password.";
        }
      }
    }
  } catch {
    error = "Could not parse this proxy entry.";
  }

  host = (host ?? "").trim().replace(/^\[|\]$/g, "");
  port = Number(port);

  if (!error && !isPublicHostname(host)) error = "Host is not a valid public hostname or IP.";
  if (!error && (!Number.isInteger(port) || port < 1 || port > 65535)) error = "Port must be between 1 and 65535.";
  if (!error && (username !== null || password !== null) && (!username || !password)) {
    error = "Username and password must be supplied together.";
  }
  return {
    lineNumber,
    raw,
    host,
    port: Number.isFinite(port) ? port : 0,
    username: username || null,
    password: password || null,
    protocol,
    fingerprint: fingerprint(protocol, host, Number.isFinite(port) ? port : 0, username || null),
    error,
  };
}

export function parseProxyList(
  text: string,
  maxEntries = 500,
  defaultProtocol: ProxyProtocol = "http",
) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const parsed: ParsedProxy[] = [];
  const malformed: ParsedProxy[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const item = parseProxyLine(lines[index], index + 1, defaultProtocol);
    if (!item) continue;
    if (parsed.length + malformed.length >= maxEntries) break;
    if (!item.error && seen.has(item.fingerprint)) {
      duplicates += 1;
      malformed.push({ ...item, error: "Duplicate entry in this upload." });
      continue;
    }
    if (!item.error) seen.add(item.fingerprint);
    (item.error ? malformed : parsed).push(item);
  }
  return { parsed, malformed, duplicates, total: parsed.length + malformed.length };
}

export function maskPassword(password: string | null) {
  if (!password) return "";
  return "•".repeat(Math.min(Math.max(password.length, 6), 14));
}
