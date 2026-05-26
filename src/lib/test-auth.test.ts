import { describe, expect, it, vi } from "vitest";
import {
  decodeE2ETestIdentity,
  encodeE2ETestIdentity,
  isTestAuthEnabled,
  isTestAuthEnabledForEnv,
} from "./test-auth";

describe("test auth cookie helpers", () => {
  it("round-trips a signed identity", async () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-32-chars-minimum");
    vi.stubEnv("ENABLE_TEST_AUTH", "1");

    const encoded = await encodeE2ETestIdentity({
      userId: "user-1",
      email: "user@example.com",
      onboardingCompletedAt: null,
    });

    await expect(decodeE2ETestIdentity(encoded)).resolves.toEqual({
      userId: "user-1",
      email: "user@example.com",
      onboardingCompletedAt: null,
    });
  });

  it("rejects tampered identities", async () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-32-chars-minimum");
    vi.stubEnv("ENABLE_TEST_AUTH", "1");

    const encoded = await encodeE2ETestIdentity({
      userId: "user-1",
      email: "user@example.com",
    });
    const tampered = `${encoded.slice(0, -1)}${encoded.endsWith("a") ? "b" : "a"}`;

    await expect(decodeE2ETestIdentity(tampered)).resolves.toBeNull();
  });

  it("keeps test auth disabled unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("ENABLE_TEST_AUTH", "0");

    expect(isTestAuthEnabled()).toBe(false);
  });

  it("keeps test auth disabled on non-local auth URLs even when flags are enabled", () => {
    expect(isTestAuthEnabledForEnv({
      NODE_ENV: "test",
      ENABLE_TEST_AUTH: "1",
      BETTER_AUTH_URL: "https://snap-interview.example.com",
    })).toBe(false);
  });
});
