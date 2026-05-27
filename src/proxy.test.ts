import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  NODE_ENV: "test" as const,
  AUTH_SECRET: "test-auth-secret-32-chars-minimum",
  BETTER_AUTH_URL: "http://localhost:3000",
  ENABLE_TEST_AUTH: "0" as const,
}));

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { proxy } from "./proxy";

function getSetCookieHeaders(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""].filter(Boolean);
}

function getCspDirective(response: Response, directiveName: string) {
  const csp = response.headers.get("content-security-policy") ?? "";
  return csp
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(directiveName));
}

describe("proxy auth cookie handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts Better Auth secure session cookies in production-style requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({
        user: {
          id: "user_123",
          email: "user@example.com",
          onboardingCompletedAt: new Date().toISOString(),
        },
        session: { id: "session_123" },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = new NextRequest("https://snapinterview.app/dashboard", {
      headers: {
        cookie: "__Secure-better-auth.session_token=signed-token",
      },
    });

    const response = await proxy(request);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBeNull();
  });

  it("clears both Better Auth session cookie names when validation fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = new NextRequest("https://snapinterview.app/dashboard", {
      headers: {
        cookie: "better-auth.session_token=plain-token; __Secure-better-auth.session_token=secure-token",
      },
    });

    const response = await proxy(request);
    const setCookieHeaders = getSetCookieHeaders(response).join("\n");

    expect(response.headers.get("location")).toBe("https://snapinterview.app/login");
    expect(setCookieHeaders).toContain("better-auth.session_token=");
    expect(setCookieHeaders).toContain("__Secure-better-auth.session_token=");
    expect(setCookieHeaders).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  });
});

describe("proxy security headers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses nonce-based script CSP without unsafe-inline JavaScript", async () => {
    const request = new NextRequest("https://snapinterview.app/");

    const response = await proxy(request);
    const scriptSrc = getCspDirective(response, "script-src");

    expect(scriptSrc).toMatch(
      /^script-src 'self' 'nonce-[A-Za-z0-9+/]+=*' 'strict-dynamic' https:\/\/va\.vercel-scripts\.com( 'unsafe-eval')?$/,
    );
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });
});
