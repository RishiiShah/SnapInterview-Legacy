import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

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
});
