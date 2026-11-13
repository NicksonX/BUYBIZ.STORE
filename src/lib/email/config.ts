import "server-only";
import { getAppUrl, getSupportEmail } from "@/lib/config";

export function getEmailProviderName() {
  return (process.env.EMAIL_PROVIDER || "resend").trim().toLowerCase();
}

export function getEmailApiKey() {
  return (
    process.env.EMAIL_API_KEY?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    ""
  );
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
  return Boolean(getEmailApiKey());
}

export function getEmailRuntimeStatus() {
  const provider = getEmailProviderName();
  return {
    configured: isEmailConfigured(),
    provider,
    providerLabel:
      provider === "resend"
        ? "Resend HTTPS API"
        : provider === "postmark"
          ? "Postmark HTTPS API"
          : `${provider} HTTPS API`,
    apiKeyPresent: Boolean(getEmailApiKey()),
    fromAddress: getEmailFromAddress(),
    supportEmail:
      process.env.EMAIL_SUPPORT_EMAIL?.trim() ||
      process.env.OFFICIAL_SUPPORT_EMAIL?.trim() ||
      getSupportEmail(),
    websiteUrl: getAppUrl(),
    smtpUsed: false,
  };
}
