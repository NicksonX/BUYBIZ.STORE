import { describe, expect, it } from "vitest";
import { calculateTerminationQuote } from "@/server/services/proxy-management";

const activatedAt = new Date("2026-01-01T00:00:00.000Z");
const quote = (amountPaidMinor: number, durationSeconds: number, days: number) =>
  calculateTerminationQuote({
    amountPaidMinor,
    durationSeconds,
    activatedAt,
    now: new Date(activatedAt.getTime() + days * 86_400_000),
  });

describe("proxy termination refunds", () => {
  it("matches the three-day worked example", () => {
    expect(quote(300_000, 3 * 86_400, 1).refundMinor).toBe(200_000);
    expect(quote(300_000, 3 * 86_400, 2).refundMinor).toBe(100_000);
    expect(quote(300_000, 3 * 86_400, 3).refundMinor).toBe(0);
  });

  it("applies completed-day rounding to the daily plan", () => {
    expect(quote(50_000, 86_400, 0.5).refundMinor).toBe(50_000);
    expect(quote(50_000, 86_400, 1).refundMinor).toBe(0);
  });

  it("applies the same rule to 7-day and 30-day personal plans", () => {
    expect(quote(100_000, 7 * 86_400, 2)).toMatchObject({
      daysUsed: 2,
      usedMinor: 28_572,
      refundMinor: 71_428,
    });
    expect(quote(500_000, 30 * 86_400, 10)).toMatchObject({
      daysUsed: 10,
      usedMinor: 166_667,
      refundMinor: 333_333,
    });
  });

  it("never refunds more than the purchase or after the full period", () => {
    const result = quote(99_999, 7 * 86_400, 99);
    expect(result.daysUsed).toBe(7);
    expect(result.refundMinor).toBe(0);
    expect(result.usedMinor).toBe(99_999);
  });
});
