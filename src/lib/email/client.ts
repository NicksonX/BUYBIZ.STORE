import "server-only";
import {
  getEmailFromAddress,
  getEmailProviderName,
  getProviderApiKey,
  type EmailProvider,
} from "@/lib/email/config";

export type ProviderSendResult =
  | { ok: true; provider: EmailProvider; providerMessageId: string | null }
  | {
      ok: false;
      provider: EmailProvider;
      error: string;
      statusCode?: number;
      uncertain?: boolean;
    };

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  fromName?: string;
  fromAddress?: string;
};

function fromHeader(input: SendInput, fromAddress: string) {
  return input.fromName
    ? `${input.fromName.replace(/["<>\r\n]/g, "").trim()} <${fromAddress}>`
    : fromAddress;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const raw = await response.text().catch(() => "");
    let json: Record<string, unknown> = {};
    try { json = raw ? JSON.parse(raw) : {}; } catch { /* provider returned non-JSON */ }
    return { response, raw, json };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * HTTPS-only provider adapters. Provider selection is performed server-side by
 * the durable rotation service; this module only performs one provider attempt.
 */
export async function sendEmailViaProvider(
  input: SendInput,
  providerOverride?: EmailProvider,
): Promise<ProviderSendResult> {
  const provider = providerOverride ?? (getEmailProviderName() === "brevo" ? "brevo" : "resend");
  const apiKey = getProviderApiKey(provider);
  const fromAddress = input.fromAddress?.trim() || getEmailFromAddress();
  if (!apiKey || !fromAddress) {
    return {
      ok: false,
      provider,
      error: `Email provider ${provider} is not configured.`,
    };
  }

  try {
    if (provider === "brevo") {
      const { response, json } = await postJson(
        "https://api.brevo.com/v3/smtp/email",
        { "api-key": apiKey, Accept: "application/json" },
        {
          sender: { name: input.fromName || "BuyBiz", email: fromAddress },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlContent: input.html,
          textContent: input.text,
          ...(input.replyTo ? { replyTo: { email: input.replyTo } } : {}),
        },
      );
      if (!response.ok) {
        return {
          ok: false,
          provider,
          error: `Brevo rejected the email (${response.status}).`,
          statusCode: response.status,
          uncertain: response.status >= 500 || response.status === 408,
        };
      }
      return { ok: true, provider, providerMessageId: String(json.messageId ?? "") || null };
    }

    const { response, json } = await postJson(
      "https://api.resend.com/emails",
      { Authorization: `Bearer ${apiKey}` },
      {
        from: fromHeader(input, fromAddress),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      },
    );
    if (!response.ok) {
      return {
        ok: false,
        provider,
        error: `Resend rejected the email (${response.status}).`,
        statusCode: response.status,
        uncertain: response.status >= 500 || response.status === 408,
      };
    }
    return { ok: true, provider, providerMessageId: String(json.id ?? "") || null };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Email provider request timed out."
      : "Email provider request failed before confirmation.";
    return { ok: false, provider, error: message, uncertain: true };
  }
}
