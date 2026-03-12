import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { hashCredentialPassword, verifyCredentialPassword } from "./password";

describe("password helpers", () => {
  it("hashes and verifies Better Auth credential passwords", async () => {
    const hash = await hashCredentialPassword("Password1!");

    await expect(
      verifyCredentialPassword({
        password: "Password1!",
        hash,
      })
    ).resolves.toBe(true);
  });

  it("verifies legacy bcrypt password hashes", async () => {
    const legacyHash = await bcrypt.hash("Password1!", 12);

    await expect(
      verifyCredentialPassword({
        password: "Password1!",
        hash: legacyHash,
      })
    ).resolves.toBe(true);
  });

  it("returns false for malformed password hashes", async () => {
    await expect(
      verifyCredentialPassword({
        password: "Password1!",
        hash: "not-a-valid-password-hash",
      })
    ).resolves.toBe(false);
  });
});