import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("demo password hashing", () => {
  it("verifies the correct password", () => {
    const hash = hashPassword("Demo1234!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("Demo1234!", hash)).toBe(true);
  });

  it("rejects an incorrect password and malformed hashes", () => {
    const hash = hashPassword("Demo1234!");
    expect(verifyPassword("Wrong1234!", hash)).toBe(false);
    expect(verifyPassword("Demo1234!", "not-a-hash")).toBe(false);
  });
});
