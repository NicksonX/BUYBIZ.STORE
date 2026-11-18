import "server-only";
import { AppError } from "@/lib/errors";
import { getAppSettings } from "@/server/data/settings";

const PAYSTACK_BASE = "https://api.paystack.co";

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export type PaystackTransaction = {
  id: number | string;
  domain: "test" | "live";
  status:
    | "success"
    | "failed"
    | "abandoned"
    | "reversed"
    | "pending"
    | "ongoing"
    | string;
  reference: string;
  amount: number;
  requested_amount?: number | null;
  currency: string;
  gateway_response?: string;
  paid_at?: string | null;
  created_at?: string;
  channel?: string | null;
  fees?: number | null;
  customer?: { email?: string | null; id?: number | null };
  metadata?: unknown;
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: PaystackTransaction;
};

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new AppError(
      "CONFIGURATION",
      "Card payments are not configured yet. Please try again later.",
    );
  }
  return key;
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${PAYSTACK_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[buybiz/paystack] network error", (error as Error).name);
    throw new AppError(
      "PAYMENT_FAILED",
      "We could not reach Paystack. Your wallet has not been credited. Please try again.",
    );
  }

  let payload: T & { status?: boolean; message?: string };
  try {
    payload = (await response.json()) as T & { status?: boolean; message?: string };
  } catch {
    throw new AppError(
      "PAYMENT_FAILED",
      "Paystack returned an unreadable response. Please try again.",
    );
  }

  if (!response.ok || payload.status === false) {
    // Never log the secret key or the entire request body.
    console.error("[buybiz/paystack] request failed", {
      path,
      httpStatus: response.status,
      message: payload.message,
    });
    throw new AppError(
      "PAYMENT_FAILED",
      "Paystack could not process that request. Please try again.",
    );
  }
  return payload as T;
}

export async function initializePaystackTransaction(input: {
  email: string;
  amountMinor: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}) {
  const settings = await getAppSettings();
  const payload = await paystackFetch<PaystackInitializeResponse>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor,
        currency: "NGN",
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: JSON.stringify(input.metadata),
        channels: settings.paystackChannels,
      }),
    },
  );
  if (!payload.data?.authorization_url) {
    throw new AppError(
      "PAYMENT_FAILED",
      "Paystack did not return a checkout URL. Please try again.",
    );
  }
  return payload.data;
}

export async function verifyPaystackTransaction(reference: string) {
  const payload = await paystackFetch<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
  if (!payload.data) {
    throw new AppError(
      "PAYMENT_FAILED",
      "Paystack did not return transaction details.",
    );
  }
  return payload.data;
}
