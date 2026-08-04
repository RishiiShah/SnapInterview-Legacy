import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
vi.mock("@/lib/server-auth", () => ({ getSessionUserIdentity: vi.fn() }));
vi.mock("@/lib/route-security", () => ({ withCsrfProtection: (handler: (request: Request, context: unknown) => unknown) => handler }));

function request(body: unknown) {
  return new Request("http://localhost/api/coding/questions/sum-pair/submit", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/coding/questions/[slug]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
  });

  it("rejects unauthenticated submissions", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const response = await POST(request({}));

    expect(response.status).toBe(401);
  });

  it("does not accept client-executed results as completion evidence", async () => {
    const response = await POST(request({ passed: true, results: [{ passed: true }] }));

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      error: "Server-side grading is not configured for coding practice.",
    });
  });
});
