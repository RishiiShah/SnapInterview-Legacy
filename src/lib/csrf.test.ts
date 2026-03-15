import { beforeEach, describe, expect, it } from "vitest";
import { csrfRejectIfInvalid, validateRequestOrigin } from "./csrf";

// eslint-disable-next-line no-process-env
const ORIGINAL_ENV = { ...process.env };

describe("csrf utilities", () => {
  beforeEach(() => {
    // eslint-disable-next-line no-process-env
    process.env = { ...ORIGINAL_ENV };
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
    // eslint-disable-next-line no-process-env
    process.env.BETTER_AUTH_URL = "https://app.example.com";

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
    // eslint-disable-next-line no-process-env
    process.env.CSRF_TRUSTED_ORIGIN_SUFFIXES = ".example.com";

    const req = new Request("https://api.example.com/api/test", {
      method: "POST",
      headers: { origin: "https://web.example.com" },
    });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(true);
    expect(result.normalizedOrigin).toBe("https://web.example.com");
  });

  it("always allows localhost:3000 origins", () => {
    const req = new Request("http://localhost:3000/api/test", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });

    const result = validateRequestOrigin(req);
    expect(result.isValid).toBe(true);
    expect(result.normalizedOrigin).toBe("http://localhost:3000");
  });
});

