import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export type PaystackWebhookEvent = {
  event: string;
  data: {
    id?: number | string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    fees?: number | null;
    channel?: string | null;
    [key: string]: unknown;
  };
};

/**
 * Paystack signs the raw request body with HMAC-SHA512 using the secret key.
 * The raw bytes must be hashed before JSON parsing or re-serialisation.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const given = signature.trim().toLowerCase();
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parsePaystackWebhook(rawBody: string): PaystackWebhookEvent | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { event?: unknown }).event === "string" &&
      typeof (parsed as { data?: unknown }).data === "object"
    ) {
      return parsed as PaystackWebhookEvent;
    }
    return null;
  } catch {
    return null;
  }
}

export function webhookEventReference(event: PaystackWebhookEvent) {
  const data = event.data ?? {};
  return [
    "paystack",
    event.event,
    data.id ?? "no-id",
    data.reference ?? "no-reference",
  ].join(":");
}
