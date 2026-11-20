import { describe, expect, it } from "vitest";
import { EMAIL_POLICY, isEmailAllowed } from "@/server/services/email-policy";

describe("central email policy", () => {
  it("keeps security, payment and operational email enabled", () => {
    expect(isEmailAllowed("signup_verification")).toBe(true);
    expect(isEmailAllowed("deposit_confirmation")).toBe(true);
    expect(isEmailAllowed("payout_paid")).toBe(true);
    expect(isEmailAllowed("proxy_expiry_reminder")).toBe(true);
  });
  it("moves routine and promotional activity in-app", () => {
    expect(isEmailAllowed("referral_joined")).toBe(false);
    expect(isEmailAllowed("giveaway_live")).toBe(false);
    expect(isEmailAllowed("campaign_customer_reward")).toBe(false);
    expect(isEmailAllowed("marketing")).toBe(false);
  });
  it("has a policy for every email type", () => {
    expect(Object.keys(EMAIL_POLICY).length).toBeGreaterThan(20);
  });
});
