import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parsePaystackWebhook,
  verifyPaystackSignature,
  webhookEventReference,
} from "@/lib/paystack/webhook";

const secret = process.env.PAYSTACK_SECRET_KEY!;

function sign(body: string) {
  return createHmac("sha512", secret).update(body, "utf8").digest("hex");
}

describe("Paystack webhook verification", () => {
  const body = JSON.stringify({
    event: "charge.success",
    data: {
      id: 12345,
      reference: "BZ-TEST-REF",
      status: "success",
      amount: 50000,
      currency: "NGN",
    },
  });

  it("accepts a valid HMAC SHA512 signature over the raw body", () => {
    expect(verifyPaystackSignature(body, sign(body))).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(verifyPaystackSignature(body, "deadbeef")).toBe(false);
    expect(verifyPaystackSignature(body, null)).toBe(false);
  });

  it("rejects a body changed after signing", () => {
    const signature = sign(body);
    expect(
      verifyPaystackSignature(body.replace("50000", "500000"), signature),
    ).toBe(false);
  });

  it("parses the event and builds a stable idempotency reference", () => {
    const event = parsePaystackWebhook(body);
    expect(event?.event).toBe("charge.success");
    expect(event?.data.reference).toBe("BZ-TEST-REF");
    expect(webhookEventReference(event!)).toContain("12345");
  });

  it("rejects malformed JSON", () => {
    expect(parsePaystackWebhook("{bad")).toBeNull();
  });
});
