import { describe, expect, it } from "vitest";
import { parseEnvFrom } from "./env";

describe("parseEnvFrom", () => {
  it("provides safe defaults in test mode while still validating URLs", () => {
    const parsed = parseEnvFrom({
      NODE_ENV: "test",
      BETTER_AUTH_URL: "http://localhost:3000",
    });

    expect(parsed.DATABASE_URL).toBe("postgresql://placeholder:placeholder@localhost:5432/placeholder");
    expect(parsed.AUTH_SECRET).toBe("test-auth-secret-32-chars-minimum");
    expect(parsed.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });

  it("still rejects invalid typed values in test mode", () => {
    expect(() =>
      parseEnvFrom({
        NODE_ENV: "test",
        BETTER_AUTH_URL: "not-a-url",
      })
    ).toThrow(/Invalid environment configuration/);
  });

  it("rejects weak production AUTH_SECRET values", () => {
    expect(() =>
      parseEnvFrom({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
        AUTH_SECRET: "short",
        BETTER_AUTH_URL: "https://example.com",
      })
    ).toThrow(/AUTH_SECRET/);
  });

  it("rejects placeholder production AUTH_SECRET values", () => {
    expect(() =>
      parseEnvFrom({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
        AUTH_SECRET: "test-auth-secret-32-chars-minimum",
        BETTER_AUTH_URL: "https://example.com",
      })
    ).toThrow(/AUTH_SECRET/);
  });

  it("rejects weak production CRON_SECRET values when configured", () => {
    expect(() =>
      parseEnvFrom({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
        AUTH_SECRET: "a-production-auth-secret-that-is-long-enough",
        BETTER_AUTH_URL: "https://example.com",
        CRON_SECRET: "short",
      })
    ).toThrow(/CRON_SECRET/);
  });
});
