import { describe, expect, it } from "vitest";
import { computeDepositMinMinor } from "@/server/data/settings";

describe("scheduled deposit minimum", () => {
  const effectiveAt = new Date("2026-11-20T00:00:00+01:00");
  it("keeps ₦2,500 before the cutoff", () => {
    const before = new Date(effectiveAt.getTime() - 60_000);
    expect(computeDepositMinMinor(before, 250_000, 300_000, "2026-11-20T00:00:00+01:00")).toBe(250_000);
  });
  it("activates ₦3,000 exactly at midnight Lagos", () => {
    expect(computeDepositMinMinor(new Date("2026-11-20T00:00:00+01:00"), 250_000, 300_000, "2026-11-20T00:00:00+01:00")).toBe(300_000);
  });
  it("stays on ₦3,000 after activation", () => {
    expect(computeDepositMinMinor(new Date("2026-11-20T00:01:00+01:00"), 250_000, 300_000, "2026-11-20T00:00:00+01:00")).toBe(300_000);
  });
});
