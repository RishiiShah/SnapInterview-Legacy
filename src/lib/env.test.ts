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
});
