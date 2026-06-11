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

  it.each([
    "/dashboard",
    "/practice",
    "/questions",
    "/questions/two-sum",
    "/analytics",
    "/recordings",
    "/settings",
    "/onboarding",
    "/interview/interview-123",
  ])("skips proxy session fetch for server-guarded protected route %s when a session cookie is present", async (path) => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const request = new NextRequest(`https://snapinterview.app${path}`, {
      headers: {
        cookie: `__Secure-better-auth.session_token=protected-route-token-${encodeURIComponent(path)}`,
      },
    });

    const response = await proxy(request);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect public auth pages when session validation is temporarily unavailable", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("pool exhausted"));

    const request = new NextRequest("https://snapinterview.app/login", {
      headers: {
        cookie: "__Secure-better-auth.session_token=validation-outage-token",
      },
    });

    const response = await proxy(request);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not clear session cookies on public auth pages when validation returns a transient server error", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "DB unavailable" }), {
        status: 503,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = new NextRequest("https://snapinterview.app/login", {
      headers: {
        cookie: "__Secure-better-auth.session_token=validation-503-token",
      },
    });

    const response = await proxy(request);
    const setCookieHeaders = getSetCookieHeaders(response).join("\n");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBeNull();
    expect(setCookieHeaders).not.toContain("__Secure-better-auth.session_token=");
  });

  it("prioritizes secure Better Auth session cookies when selecting the session cache key", async () => {
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

    const secureToken = "secure-priority-token";
    const firstRequest = new NextRequest("https://snapinterview.app/login", {
      headers: {
        cookie: `better-auth.session_token=plain-token-one; __Secure-better-auth.session_token=${secureToken}`,
      },
    });
    const secondRequest = new NextRequest("https://snapinterview.app/login", {
      headers: {
        cookie: `better-auth.session_token=plain-token-two; __Secure-better-auth.session_token=${secureToken}`,
      },
    });

    const firstResponse = await proxy(firstRequest);
    const secondResponse = await proxy(secondRequest);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(firstResponse.headers.get("location")).toBe("https://snapinterview.app/dashboard");
    expect(secondResponse.headers.get("location")).toBe("https://snapinterview.app/dashboard");
  });

  it("skips proxy session fetch for admin routes when a session cookie is present", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const request = new NextRequest("https://snapinterview.app/admin/questions/new", {
      headers: {
        cookie: "better-auth.session_token=plain-token",
      },
    });

    const response = await proxy(request);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBeNull();
  });

  it("clears both Better Auth session cookie names on public auth pages when validation fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = new NextRequest("https://snapinterview.app/login", {
      headers: {
        cookie: "better-auth.session_token=plain-token; __Secure-better-auth.session_token=secure-token",
      },
    });

    const response = await proxy(request);
    const setCookieHeaders = getSetCookieHeaders(response).join("\n");

    expect(response.headers.get("location")).toBeNull();
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
