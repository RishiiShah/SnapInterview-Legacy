import nextConfig from "../../next.config";
import { describe, expect, it } from "vitest";
import { applyStaticSecurityHeaders, STATIC_SECURITY_HEADERS } from "./security-headers";

describe("static security headers", () => {
  it("preserves the exact static header policy", () => {
    expect(STATIC_SECURITY_HEADERS).toEqual([
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(self), geolocation=()",
      },
    ]);
  });

  it("applies the static header policy without removing existing response headers", () => {
    const headers = new Headers({ "x-request-id": "request-123" });

    applyStaticSecurityHeaders(headers);

    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains; preload");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toBe("camera=(self), microphone=(self), geolocation=()");
    expect(headers.get("x-request-id")).toBe("request-123");
  });

  it("uses the canonical headers in Next config", async () => {
    const rules = await nextConfig.headers?.();

    expect(rules?.[0]?.headers).toEqual([...STATIC_SECURITY_HEADERS]);
  });
});
