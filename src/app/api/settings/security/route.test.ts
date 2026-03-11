import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { getCurrentSessionRecord } from "@/lib/auth-session";
import { recordSecurityEvent, revokeUserSessions } from "@/lib/account-security";
import { extractRequestContext } from "@/lib/security";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getCurrentSessionRecord: vi.fn(),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
  revokeUserSessions: vi.fn(),
}));

vi.mock("@/lib/security", () => ({
  extractRequestContext: vi.fn(() => ({ ipHash: "ip-hash", userAgent: "Safari on macOS" })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    securityEvent: {
      findMany: vi.fn(),
    },
  },
}));

describe("/api/settings/security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/settings/security"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("GET returns current sessions and recent events", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(getCurrentSessionRecord).mockResolvedValue({
      id: "session-current",
      sessionToken: "token-current",
      userId: "user-1",
      expires: new Date("2026-03-20T00:00:00.000Z"),
      revokedAt: null,
    });
    vi.mocked(prisma.session.findMany).mockResolvedValue([
      {
        id: "session-current",
        expires: new Date("2026-03-20T00:00:00.000Z"),
        userAgent: "Safari on macOS",
        lastSeenAt: new Date("2026-03-11T10:00:00.000Z"),
        revokedAt: null,
      },
    ]);
    vi.mocked(prisma.securityEvent.findMany).mockResolvedValue([
      {
        id: "event-1",
        type: "LOGIN_SUCCESS",
        createdAt: new Date("2026-03-11T09:00:00.000Z"),
        userAgent: "Safari on macOS",
        metadata: { provider: "credentials" },
      },
    ]);

    const response = await GET(new Request("http://localhost/api/settings/security"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessions: [
        {
          id: "session-current",
          current: true,
          expiresAt: "2026-03-20T00:00:00.000Z",
          lastSeenAt: "2026-03-11T10:00:00.000Z",
          revokedAt: null,
          userAgent: "Safari on macOS",
        },
      ],
      events: [
        {
          id: "event-1",
          type: "LOGIN_SUCCESS",
          createdAt: "2026-03-11T09:00:00.000Z",
          userAgent: "Safari on macOS",
          metadata: { provider: "credentials" },
        },
      ],
    });
  });

  it("POST touches the current session", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(getCurrentSessionRecord).mockResolvedValue({
      id: "session-current",
      sessionToken: "token-current",
      userId: "user-1",
      expires: new Date("2026-03-20T00:00:00.000Z"),
      revokedAt: null,
    });

    const request = new Request("http://localhost/api/settings/security", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    });

    const response = await POST(request);

    expect(extractRequestContext).toHaveBeenCalledWith(request.headers);
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-current" },
      data: {
        lastSeenAt: expect.any(Date),
        userAgent: "Safari on macOS",
        ipHash: "ip-hash",
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("PATCH revokeOthers passes the current session token as an exclusion", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(getCurrentSessionRecord).mockResolvedValue({
      id: "session-current",
      sessionToken: "token-current",
      userId: "user-1",
      expires: new Date("2026-03-20T00:00:00.000Z"),
      revokedAt: null,
    });
    vi.mocked(revokeUserSessions).mockResolvedValue(3);

    const request = new Request("http://localhost/api/settings/security", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "revokeOthers" }),
    });

    const response = await PATCH(request);

    expect(revokeUserSessions).toHaveBeenCalledWith({
      userId: "user-1",
      excludeSessionToken: "token-current",
      reason: "manual_revoke",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, revokedCount: 3 });
  });

  it("PATCH rejects attempts to revoke the current session", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(getCurrentSessionRecord).mockResolvedValue({
      id: "session-current",
      sessionToken: "token-current",
      userId: "user-1",
      expires: new Date("2026-03-20T00:00:00.000Z"),
      revokedAt: null,
    });

    const request = new Request("http://localhost/api/settings/security", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "revoke", sessionId: "session-current" }),
    });

    const response = await PATCH(request);

    expect(prisma.session.findFirst).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Use sign out to end your current session." });
  });

  it("PATCH revokes a specific owned session and records the event", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(getCurrentSessionRecord).mockResolvedValue({
      id: "session-current",
      sessionToken: "token-current",
      userId: "user-1",
      expires: new Date("2026-03-20T00:00:00.000Z"),
      revokedAt: null,
    });
    vi.mocked(prisma.session.findFirst).mockResolvedValue({ id: "session-2" });

    const request = new Request("http://localhost/api/settings/security", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "revoke", sessionId: "session-2" }),
    });

    const response = await PATCH(request);

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "session-2" },
      data: {
        revokedAt: expect.any(Date),
        expires: expect.any(Date),
      },
    });
    expect(recordSecurityEvent).toHaveBeenCalledWith({
      type: "SESSION_REVOKED",
      userId: "user-1",
      email: "user@example.com",
      metadata: { reason: "manual_revoke", sessionId: "session-2" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, revokedCount: 1 });
  });
});