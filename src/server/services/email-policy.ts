import "server-only";
import type { EmailType } from "@/lib/email/templates";

export type EmailCategory = "essential" | "in_app_only" | "marketing";

export type EmailPolicyEntry = {
  type: EmailType;
  category: EmailCategory;
  email: boolean;
  reason: string;
};

/**
 * Central server-side email policy. Every queued and legacy delivery passes
 * through this map. Routine activity is moved to the in-app notification
 * centre; only security, financial and operational messages may email.
 */
export const EMAIL_POLICY: Record<EmailType, EmailPolicyEntry> = {
  signup_verification: { type: "signup_verification", category: "essential", email: true, reason: "Required to verify a new account." },
  provider_test: { type: "provider_test", category: "essential", email: true, reason: "Administrator-only provider health check." },
  welcome: { type: "welcome", category: "in_app_only", email: false, reason: "Account welcome is not security critical." },
  deposit_confirmation: { type: "deposit_confirmation", category: "essential", email: true, reason: "Payment receipt for a successful deposit." },
  referral_joined: { type: "referral_joined", category: "in_app_only", email: false, reason: "Referral activity is shown in the notification centre." },
  referral_qualified: { type: "referral_qualified", category: "in_app_only", email: false, reason: "Referral progress is shown in-app." },
  referral_reward: { type: "referral_reward", category: "in_app_only", email: false, reason: "Reward updates are shown in-app." },
  ambassador_promotion: { type: "ambassador_promotion", category: "in_app_only", email: false, reason: "Ambassador progress is shown in-app." },
  ambassador_commission: { type: "ambassador_commission", category: "in_app_only", email: false, reason: "Commission updates are shown in-app." },
  payout_requested: { type: "payout_requested", category: "in_app_only", email: false, reason: "Payout request is visible in the dashboard." },
  payout_approved: { type: "payout_approved", category: "essential", email: true, reason: "Financial status change requiring the customer's attention." },
  payout_rejected: { type: "payout_rejected", category: "essential", email: true, reason: "Financial status change requiring the customer's attention." },
  payout_paid: { type: "payout_paid", category: "essential", email: true, reason: "Confirmed payout transaction receipt." },
  deposit_followup: { type: "deposit_followup", category: "in_app_only", email: false, reason: "Routine reminder; available in-app." },
  deposit_recovery_apology: { type: "deposit_recovery_apology", category: "in_app_only", email: false, reason: "Routine recovery notice." },
  campaign_customer_reward: { type: "campaign_customer_reward", category: "in_app_only", email: false, reason: "Campaign reward is visible in-app." },
  campaign_referrer_reward: { type: "campaign_referrer_reward", category: "in_app_only", email: false, reason: "Campaign reward is visible in-app." },
  campaign_payout_requested: { type: "campaign_payout_requested", category: "in_app_only", email: false, reason: "Payout request is visible in-app." },
  campaign_payout_approved: { type: "campaign_payout_approved", category: "essential", email: true, reason: "Financial payout status change." },
  campaign_payout_paid: { type: "campaign_payout_paid", category: "essential", email: true, reason: "Confirmed campaign payout receipt." },
  campaign_payout_rejected: { type: "campaign_payout_rejected", category: "essential", email: true, reason: "Financial payout status change requiring action." },
  proxy_rotation_reminder: { type: "proxy_rotation_reminder", category: "essential", email: true, reason: "Admin-only proxy rotation reminder." },
  proxy_credentials_updated: { type: "proxy_credentials_updated", category: "essential", email: true, reason: "Active proxy customer credential rotation notice." },
  proxy_expiry_reminder: { type: "proxy_expiry_reminder", category: "essential", email: true, reason: "Operational notice before paid proxy access expires." },
  giveaway_live: { type: "giveaway_live", category: "in_app_only", email: false, reason: "Promotional announcement; use dashboard notices." },
  giveaway_claim_received: { type: "giveaway_claim_received", category: "in_app_only", email: false, reason: "Giveaway claim is visible in-app." },
  giveaway_approved: { type: "giveaway_approved", category: "in_app_only", email: false, reason: "Giveaway status is visible in-app." },
  giveaway_winner_announcement: { type: "giveaway_winner_announcement", category: "essential", email: true, reason: "Approved winner announcement requested by an administrator." },
  giveaway_winner_paid: { type: "giveaway_winner_paid", category: "essential", email: true, reason: "Confirmed giveaway payment receipt." },
  marketing: { type: "marketing", category: "marketing", email: false, reason: "Optional marketing is not sent under the conservative policy." },
};

export function getEmailPolicy(type: EmailType): EmailPolicyEntry {
  return EMAIL_POLICY[type];
}

export function isEmailAllowed(type: EmailType): boolean {
  return getEmailPolicy(type).email;
}

export function emailPolicySummary() {
  const entries = Object.values(EMAIL_POLICY);
  return {
    essential: entries.filter((entry) => entry.category === "essential"),
    inAppOnly: entries.filter((entry) => entry.category === "in_app_only"),
    marketing: entries.filter((entry) => entry.category === "marketing"),
  };
}
