import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDemoMode } from "@/lib/config";

const VERSION = "v1";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const DATA_DIR = process.env.DEMO_DB_DIR || path.join(process.cwd(), ".data");
const DEMO_KEY_PATH = path.join(DATA_DIR, "demo-encryption.key");

let cachedKey: Promise<Buffer> | null = null;

function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, "hex");
  } else {
    key = Buffer.from(trimmed, "base64");
  }
  if (key.length !== 32) {
    throw new Error(
      "PROXY_CREDENTIAL_ENCRYPTION_KEY must be 32 bytes encoded as base64 or 64 hex characters.",
    );
  }
  return key;
}

async function loadKey(): Promise<Buffer> {
  const configured = process.env.PROXY_CREDENTIAL_ENCRYPTION_KEY;
  if (configured) return parseKey(configured);

  if (!isDemoMode()) {
    throw new Error(
      "Proxy credential encryption is not configured. Set PROXY_CREDENTIAL_ENCRYPTION_KEY in the server environment.",
    );
  }

  // Demo/local only: persist a generated key with restrictive permissions so
  // seed inventory remains decryptable across restarts.
  try {
    const existing = await readFile(DEMO_KEY_PATH, "utf8");
    return parseKey(existing);
  } catch {
    await mkdir(DATA_DIR, { recursive: true });
    const key = randomBytes(32);
    await writeFile(DEMO_KEY_PATH, key.toString("base64"), { mode: 0o600 });
    await chmod(DEMO_KEY_PATH, 0o600).catch(() => undefined);
    return key;
  }
}

export async function getEncryptionKey(): Promise<Buffer> {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export async function decryptSecret(payload: string): Promise<string> {
  const key = await getEncryptionKey();
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported encrypted credential format.");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const data = Buffer.from(parts[3], "base64url");
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Invalid encrypted credential payload.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export async function encryptOptional(
  value: string | null | undefined,
): Promise<string | null> {
  const cleaned = value?.trim();
  if (!cleaned) return null;
  return encryptSecret(cleaned);
}

export async function decryptOptional(
  value: string | null | undefined,
): Promise<string | null> {
  if (!value) return null;
  return decryptSecret(value);
}
