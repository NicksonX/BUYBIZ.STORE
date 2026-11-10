import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DEMO_DB_DIR || path.join(process.cwd(), ".data");
const SECRET_PATH = path.join(DATA_DIR, "demo-session.key");

let cachedSecret: Promise<string> | null = null;

async function loadSecret(): Promise<string> {
  const configured = process.env.DEMO_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;
  try {
    return await readFile(SECRET_PATH, "utf8");
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    const secret = randomBytes(32).toString("base64");
    await writeFile(SECRET_PATH, secret, { mode: 0o600 });
    await chmod(SECRET_PATH, 0o600).catch(() => undefined);
    return secret;
  }
}

async function getSecret() {
  if (!cachedSecret) cachedSecret = loadSecret();
  return cachedSecret;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createSessionToken(
  userId: string,
  maxAgeSeconds = 60 * 60 * 24 * 14,
) {
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: expiresAt }),
    "utf8",
  ).toString("base64url");
  const signature = sign(payload, await getSecret());
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, await getSecret());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { sub?: unknown; exp?: unknown };
    if (typeof parsed.sub !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp <= Date.now()) return null;
    return { userId: parsed.sub };
  } catch {
    return null;
  }
}
