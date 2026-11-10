import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";

describe("proxy credential encryption", () => {
  it("round-trips a credential", async () => {
    const encrypted = await encryptSecret("upstream-password");
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(encrypted).not.toContain("upstream-password");
    expect(await decryptSecret(encrypted)).toBe("upstream-password");
  });

  it("rejects a tampered ciphertext or format", async () => {
    const encrypted = await encryptSecret("upstream-password");
    const parts = encrypted.split(".");
    const tampered = [parts[0], parts[1], parts[2], `${parts[3]}x`].join(".");
    await expect(decryptSecret(tampered)).rejects.toThrow();
    await expect(decryptSecret("v2.invalid")).rejects.toThrow();
  });
});
