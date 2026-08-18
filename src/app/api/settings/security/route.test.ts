import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";
import { NextResponse } from "next/server";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getCurrentSession, getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
  getCurrentSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    securityEvent: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      revokeOtherSessions: vi.fn(),
      revokeSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("PATCH /api/settings/security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
  });

  it("returns 403 when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const request = new Request("http://localhost/api/settings/security", {
      method: "PATCH",
      body: JSON.stringify({ action: "revokeOthers" }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(403);
    expect(getSessionUserIdentity).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("starts five device-session revocations before waiting for capacity", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(getCurrentSession).mockResolvedValue({ id: "current-session" } as never);
    vi.mocked(headers).mockResolvedValue(new Headers());
    vi.mocked(prisma.session.findMany)
      .mockResolvedValueOnce([
        { id: "session-1" },
        { id: "session-2" },
        { id: "session-3" },
        { id: "session-4" },
        { id: "session-5" },
        { id: "session-6" },
      ] as never)
      .mockResolvedValueOnce([
        { id: "session-1", token: "token-1" },
        { id: "session-2", token: "token-2" },
        { id: "session-3", token: "token-3" },
        { id: "session-4", token: "token-4" },
        { id: "session-5", token: "token-5" },
        { id: "session-6", token: "token-6" },
      ] as never);

    const resolvers: Array<() => void> = [];
    vi.mocked(auth.api.revokeSession).mockImplementation(
      () => new Promise<{ status: boolean }>((resolve) => resolvers.push(() => resolve({ status: true }))),
    );

    const responsePromise = PATCH(new Request("http://localhost/api/settings/security", {
      method: "PATCH",
      body: JSON.stringify({ action: "revokeDevice", deviceKey: "Chrome" }),
    }));

    await vi.waitFor(() => {
      expect(auth.api.revokeSession).toHaveBeenCalledTimes(5);
    });
    expect(responsePromise).toBeInstanceOf(Promise);
    expect(auth.api.revokeSession).not.toHaveBeenCalledWith(
      expect.objectContaining({ body: { token: "token-6" } }),
    );

    resolvers.splice(0).forEach((resolve) => resolve());

    await vi.waitFor(() => {
      expect(auth.api.revokeSession).toHaveBeenCalledTimes(6);
    });
    resolvers.splice(0).forEach((resolve) => resolve());

    const response = await responsePromise;
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, revokedCount: 6 });
  });

  it("returns 400 when request body is malformed JSON", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const request = new Request("http://localhost/api/settings/security", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: "not-json",
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
  });
});
