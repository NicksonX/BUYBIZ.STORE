import { describe, expect, it } from "vitest";
import { renderEmail } from "@/lib/email/templates";

describe("branded transactional email templates", () => {
  it("renders the OTP and includes brand, support and website details", () => {
    const rendered = renderEmail({
      type: "signup_verification",
      data: { name: "Ada", code: "123456", expiresMinutes: 10 },
      websiteUrl: "https://buybiz.store",
      supportEmail: "support@buybiz.store",
    });
    expect(rendered.subject).toContain("BUYBIZ");
    expect(rendered.html).toContain("123456");
    expect(rendered.html).toContain("BUYBIZ");
    expect(rendered.html).toContain("support@buybiz.store");
    expect(rendered.html).toContain("buybiz.store");
    expect(rendered.text).toContain("123456");
  });

  it("renders referral and payout amounts without mixing currencies", () => {
    const referral = renderEmail({
      type: "referral_reward",
      data: { name: "Ada", amountLabel: "₦1,000", balanceLabel: "₦4,000" },
      websiteUrl: "https://buybiz.store",
      supportEmail: "support@buybiz.store",
    });
    expect(referral.html).toContain("₦1,000");
    const payout = renderEmail({
      type: "payout_paid",
      data: { name: "Ada", amountLabel: "$30.00", txHash: "0xabc" },
      websiteUrl: "https://buybiz.store",
      supportEmail: "support@buybiz.store",
    });
    expect(payout.html).toContain("$30.00");
    expect(payout.html).toContain("0xabc");
    expect(payout.html).not.toContain("₦30.00");
  });

  it("renders campaign customer and referrer rewards as separate USD messages", () => {
    const base = { websiteUrl: "https://buybiz.store", supportEmail: "support@buybiz.store" };
    const customer = renderEmail({ ...base, type: "campaign_customer_reward", data: { name: "Ada", rewardLabel: "$10.00", payoutDate: "24 December 2026", campaignName: "The $10 + $10 Referral Campaign" } });
    const referrer = renderEmail({ ...base, type: "campaign_referrer_reward", data: { name: "Tunde", referralName: "Ada", rewardLabel: "$10.00", payoutDate: "24 December 2026", campaignName: "The $10 + $10 Referral Campaign" } });
    expect(customer.html).toContain("$10.00");
    expect(referrer.html).toContain("$10.00");
    expect(customer.html).toContain("You just earned $10.");
    expect(referrer.html).toContain("unlocked your $10");
    expect(referrer.html).toContain("You both win");
    expect(customer.html).not.toContain("₦10.00");
  });
});
