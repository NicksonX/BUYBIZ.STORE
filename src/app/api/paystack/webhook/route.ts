import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { processPaystackWebhook } from "@/server/services/deposits";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook receiver.
 *
 * The raw body is read before any JSON parsing and verified with the
 * x-paystack-signature HMAC. Invalid signatures are rejected and never reach
 * the database. Processing is idempotent via webhook_events and the unique
 * wallet ledger reference.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const result = await processPaystackWebhook({ rawBody, signature });
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "FORBIDDEN") {
        return NextResponse.json(
          { ok: false, message: "Invalid signature." },
          { status: 401 },
        );
      }
      if (error.code === "CONFIGURATION") {
        return NextResponse.json(
          { ok: false, message: "Payments are not configured." },
          { status: 503 },
        );
      }
      if (error.code === "VALIDATION") {
        return NextResponse.json(
          { ok: false, message: "Invalid payload." },
          { status: 400 },
        );
      }
    }
    console.error("[buybiz/paystack/webhook] processing failed", (error as Error).message);
    return NextResponse.json(
      { ok: false, message: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
