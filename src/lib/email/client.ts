import "server-only";
import {
  getEmailApiKey,
  getEmailFromAddress,
  getEmailProviderName,
} from "@/lib/email/config";

export type ProviderSendResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string; statusCode?: number };

type SendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  fromName?: string;
  fromAddress?: string;
};

/**
 * HTTPS-only email delivery. No SMTP ports are used, so this works on Render's
 * free web services. Currently supports Resend's API; unsupported providers
 * fail closed with a clear setup error instead of pretending an email was sent.
 */
export async function sendEmailViaProvider(
  input: SendInput,
): Promise<ProviderSendResult> {
  const provider = getEmailProviderName();
  const apiKey = getEmailApiKey();
  const fromAddress = input.fromAddress?.trim() || getEmailFromAddress();
  if (!apiKey || !fromAddress) {
    return {
      ok: false,
      error: "Email provider is not configured. Set EMAIL_API_KEY and a sender address.",
    };
  }
  if (provider !== "resend") {
    return {
      ok: false,
      error: `Email provider "${provider}" is not supported by this build. Use Resend or add a server-side adapter.`,
    };
  }

  const from = input.fromName
    ? `${input.fromName.replace(/["<>\r\n]/g, "").trim()} <${fromAddress}>`
    : fromAddress;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Provider rejected the email (${response.status}): ${body.slice(0, 300)}`,
        statusCode: response.status,
      };
    }
    const json = (await response.json().catch(() => ({}))) as { id?: string };
    return { ok: true, providerMessageId: json.id ?? null };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Email provider request timed out."
        : error instanceof Error
          ? error.message
          : "Email provider request failed.";
    return { ok: false, error: message.slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}
