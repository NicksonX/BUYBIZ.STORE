import "server-only";
import { getAppUrl, getSupportEmail } from "@/lib/config";

export function getEmailProviderName() {
  return (process.env.EMAIL_PROVIDER || "brevo").trim().toLowerCase();
}

export function getEmailApiKey() {
  return (
    process.env.EMAIL_API_KEY?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    ""
  );
}

export type EmailProvider = "resend" | "brevo";

export function getProviderApiKey(provider: EmailProvider) {
  return provider === "brevo"
    ? process.env.BREVO_API_KEY?.trim() || ""
    : getEmailApiKey();
}

export function isProviderEnabled(provider: EmailProvider) {
  const disabled = (process.env.EMAIL_PROVIDER_DISABLED || "")
    .split(",")
    .map((value) => value.trim().toLowerCase());
  return !disabled.includes(provider);
}

export function getProviderDailyLimit(provider: EmailProvider): number | null {
  const raw = provider === "brevo"
    ? process.env.BREVO_DAILY_LIMIT || "300"
    : process.env.RESEND_DAILY_LIMIT;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

export function getEmailRotationEnabled() {
  return (process.env.EMAIL_ROTATION_ENABLED || "false").trim().toLowerCase() === "true";
}

export function getQuotaDate() {
  const timeZone = process.env.EMAIL_QUOTA_TIMEZONE?.trim() || "UTC";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getEmailFromAddress() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.EMAIL_SENDER_EMAIL?.trim() ||
    process.env.OFFICIAL_SUPPORT_EMAIL?.trim() ||
    ""
  );
}

export function isEmailConfigured() {
  // The sender address may come from the admin setting at send time. The API
  // key is the hard provider requirement; a missing sender is reported by the
  // send attempt rather than pretending the email went out.
  return Boolean(getEmailApiKey() || getProviderApiKey("brevo"));
}

export function getEmailRuntimeStatus() {
  const provider = getEmailProviderName();
  const resendKey = Boolean(getEmailApiKey());
  const brevoKey = Boolean(getProviderApiKey("brevo"));
  const rotating = resendKey && brevoKey;
  return {
    configured: isEmailConfigured(),
    provider: rotating ? "resend+brevo" : provider,
    providerLabel: rotating
      ? "Resend + Brevo rotation"
      : provider === "brevo"
        ? "Brevo HTTPS API"
        : "Resend HTTPS API",
    apiKeyPresent: resendKey || brevoKey,
    fromAddress: getEmailFromAddress(),
    supportEmail:
      process.env.EMAIL_SUPPORT_EMAIL?.trim() ||
      process.env.OFFICIAL_SUPPORT_EMAIL?.trim() ||
      getSupportEmail(),
    websiteUrl: getAppUrl(),
    smtpUsed: false,
  };
}
