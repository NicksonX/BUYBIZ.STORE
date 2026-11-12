import "server-only";

export const APP_NAME = "BUYBIZ";
export const APP_CURRENCY = "NGN";

/**
 * Demo mode uses the embedded PGlite database, local sessions and a clearly
 * labelled payment simulator. It must never be enabled for a real deployment.
 */
export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function isSupabaseAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isDatabaseConfigured() {
  return isDemoMode() || Boolean(process.env.DATABASE_URL);
}

export function isAiSupportConfigured() {
  return Boolean(process.env.AI_SUPPORT_API_KEY);
}

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function getPaystackMode(): "test" | "live" {
  return process.env.PAYSTACK_MODE === "live" ? "live" : "test";
}

export function getAppUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function isGoogleAuthEnabled() {
  return (
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" &&
    isSupabaseAuthConfigured()
  );
}

export function getSupportEmail() {
  return process.env.OFFICIAL_SUPPORT_EMAIL?.trim() || "";
}

/**
 * Fail loudly at request time when a production deploy has not been wired up.
 * Returns a human-safe diagnostic, never a secret value.
 */
export function getConfigurationIssues() {
  const issues: string[] = [];
  if (isDemoMode()) return issues;

  if (!isSupabaseAuthConfigured()) {
    issues.push(
      "Supabase Auth is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  if (!process.env.DATABASE_URL) {
    issues.push("DATABASE_URL is not configured for the application server.");
  }
  if (!process.env.PAYSTACK_SECRET_KEY) {
    issues.push(
      "Paystack is not configured (PAYSTACK_SECRET_KEY). Wallet deposits are disabled.",
    );
  }
  if (!process.env.PROXY_CREDENTIAL_ENCRYPTION_KEY) {
    issues.push(
      "PROXY_CREDENTIAL_ENCRYPTION_KEY is missing; proxy inventory cannot be saved securely.",
    );
  }
  return issues;
}
