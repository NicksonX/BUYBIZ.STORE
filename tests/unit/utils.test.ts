import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatNaira,
  formatSignedNaira,
  maskValue,
  parseNairaToKobo,
  remainingParts,
  safeNextPath,
} from "@/lib/utils";

describe("money formatting", () => {
  it("formats whole naira and exact amounts", () => {
    expect(formatNaira(50_000)).toContain("500");
    expect(formatNaira(24_750_000, { exact: true })).toContain("247,500");
    expect(formatNaira(100_000, { exact: true })).toContain(".00");
  });

  it("formats signed ledger amounts", () => {
    expect(formatSignedNaira(-300_000)).toMatch(/^−/);
    expect(formatSignedNaira(500_000)).toMatch(/^\+/);
  });

  it("parses naira input without floating point errors", () => {
    expect(parseNairaToKobo("1,000.50")).toBe(100_050);
    expect(parseNairaToKobo("500")).toBe(50_000);
    expect(parseNairaToKobo("0.10")).toBe(10);
    expect(parseNairaToKobo("-5")).toBeNull();
    expect(parseNairaToKobo("abc")).toBeNull();
    expect(parseNairaToKobo("1.234")).toBeNull();
  });
});

describe("safe redirects", () => {
  it("allows same-origin paths", () => {
    expect(safeNextPath("/dashboard/wallet")).toBe("/dashboard/wallet");
    expect(safeNextPath("/admin")).toBe("/admin");
  });

  it("rejects protocol-relative and external redirects", () => {
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("/auth/callback")).toBe("/dashboard");
  });
});

describe("display helpers", () => {
  it("formats durations and remaining time", () => {
    expect(formatDuration(86400)).toBe("24 hours");
    expect(formatDuration(604800)).toBe("7 days");
    expect(formatDuration(null)).toBe("Not set");
    const future = new Date(Date.now() + 90 * 60_000);
    const remaining = remainingParts(future);
    expect(remaining.expired).toBe(false);
    expect(remaining.totalSeconds).toBeGreaterThan(0);
  });

  it("masks credentials without exposing the whole value", () => {
    expect(maskValue("supersecret", 2)).not.toContain("supersecret");
    expect(maskValue("supersecret", 2).endsWith("et")).toBe(true);
    expect(maskValue(null)).toBe("Not required");
  });
});
