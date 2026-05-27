import { beforeEach, describe, expect, it, vi } from "vitest";
import { csrfRejectIfInvalid, validateRequestOrigin, _resetOriginCacheForTesting } from "./csrf";

// vi.mock is hoisted, so mockEnv must be declared with vi.hoisted to be accessible
// inside the factory and in the tests below.
const mockEnv = vi.hoisted(() => ({
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: undefined as string | undefined,
  APP_URL: undefined as string | undefined,
  CSRF_TRUSTED_ORIGINS: undefined as string | undefined,
  CSRF_TRUSTED_ORIGIN_SUFFIXES: undefined as string | undefined,
  NODE_ENV: "test" as "test" | "development" | "production",
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

describe("csrf utilities", () => {
  beforeEach(() => {
    // Reset per-test env overrides back to safe defaults.
    mockEnv.BETTER_AUTH_URL = "http://localhost:3000";
    mockEnv.NEXT_PUBLIC_APP_URL = undefined;
    mockEnv.APP_URL = undefined;
    mockEnv.CSRF_TRUSTED_ORIGINS = undefined;
    mockEnv.CSRF_TRUSTED_ORIGIN_SUFFIXES = undefined;
    mockEnv.NODE_ENV = "test";
    // Flush the module-level cache so each test starts fresh.
    _resetOriginCacheForTesting();
  });

  it("rejects when origin header is missing or invalid", () => {
    const req = new Request("http://localhost/api/test", { method: "POST" });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(false);
    expect(result.normalizedOrigin).toBeNull();

    const res = csrfRejectIfInvalid(req);
    expect(res?.status).toBe(403);
  });

  it("accepts origins that match configured allowed origins", () => {
    mockEnv.BETTER_AUTH_URL = "https://app.example.com";

    const req = new Request("https://api.example.com/api/test", {
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(true);
    expect(result.normalizedOrigin).toBe("https://app.example.com");

    const res = csrfRejectIfInvalid(req);
    expect(res).toBeNull();
  });

  it("accepts origins whose hostname matches a trusted suffix", () => {
    mockEnv.CSRF_TRUSTED_ORIGIN_SUFFIXES = ".example.com";

    const req = new Request("https://api.example.com/api/test", {
      method: "POST",
      headers: { origin: "https://web.example.com" },
    });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(true);
    expect(result.normalizedOrigin).toBe("https://web.example.com");
  });

  it("always allows localhost:3000 origins in non-production", () => {
    mockEnv.BETTER_AUTH_URL = "https://prod.example.com";

    const req = new Request("http://localhost:3000/api/test", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(true);
    expect(result.normalizedOrigin).toBe("http://localhost:3000");
  });

  it("rejects localhost:3000 in production", () => {
    mockEnv.NODE_ENV = "production" as never;
    mockEnv.BETTER_AUTH_URL = "https://prod.example.com";

    const req = new Request("https://prod.example.com/api/test", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(false);
  });

  it("accepts extra origins from CSRF_TRUSTED_ORIGINS", () => {
    mockEnv.CSRF_TRUSTED_ORIGINS = "https://partner.example.com, https://other.example.com";

    const req = new Request("https://api.example.com/api/test", {
      method: "POST",
      headers: { origin: "https://partner.example.com" },
    });

    expect(validateRequestOrigin(req).isValid).toBe(true);
  });

  it("accepts suffix without a leading dot in CSRF_TRUSTED_ORIGIN_SUFFIXES", () => {
    // "example.com" has no leading dot — getTrustedSuffixes must prepend one
    mockEnv.CSRF_TRUSTED_ORIGIN_SUFFIXES = "example.com";

    const req = new Request("https://api.example.com/api/test", {
      method: "POST",
      headers: { origin: "https://web.example.com" },
    });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(true);
    expect(result.normalizedOrigin).toBe("https://web.example.com");

    const nonSubdomainReq = new Request("https://api.example.com/api/test", {
      method: "POST",
      headers: { origin: "https://notexample.com" },
    });
    expect(validateRequestOrigin(nonSubdomainReq).isValid).toBe(false);
  });

  it("rejects shared platform suffixes even when configured", () => {
    mockEnv.NODE_ENV = "production" as never;
    mockEnv.BETTER_AUTH_URL = "https://snapinterview.app";
    mockEnv.CSRF_TRUSTED_ORIGIN_SUFFIXES = ".vercel.app";

    const req = new Request("https://snapinterview.app/api/test", {
      method: "POST",
      headers: { origin: "https://attacker.vercel.app" },
    });

    expect(validateRequestOrigin(req).isValid).toBe(false);
  });

  it("automatically trusts the exact VERCEL_URL if present", () => {
    vi.stubEnv("VERCEL_URL", "snapinterview-123456-team.vercel.app");
    _resetOriginCacheForTesting(); // reload cache with new process.env

    // The deployment URL itself is valid
    const validReq = new Request("https://snapinterview.app/api/test", {
      method: "POST",
      headers: { origin: "https://snapinterview-123456-team.vercel.app" },
    });
    expect(validateRequestOrigin(validReq).isValid).toBe(true);

    // But another random Vercel URL is NOT valid
    const invalidReq = new Request("https://snapinterview.app/api/test", {
      method: "POST",
      headers: { origin: "https://attacker.vercel.app" },
    });
    expect(validateRequestOrigin(invalidReq).isValid).toBe(false);
    
    vi.unstubAllEnvs();
  });

  it("automatically trusts the exact VERCEL_BRANCH_URL if present", () => {
    vi.stubEnv("VERCEL_BRANCH_URL", "snapinterview-git-main-team.vercel.app");
    _resetOriginCacheForTesting(); // reload cache with new process.env

    // The deployment URL itself is valid
    const validReq = new Request("https://snapinterview.app/api/test", {
      method: "POST",
      headers: { origin: "https://snapinterview-git-main-team.vercel.app" },
    });
    expect(validateRequestOrigin(validReq).isValid).toBe(true);

    // But another random Vercel URL is NOT valid
    const invalidReq = new Request("https://snapinterview.app/api/test", {
      method: "POST",
      headers: { origin: "https://other.vercel.app" },
    });
    expect(validateRequestOrigin(invalidReq).isValid).toBe(false);
    
    vi.unstubAllEnvs();
  });
});
