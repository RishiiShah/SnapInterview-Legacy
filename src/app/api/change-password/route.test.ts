import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getServerAuthSession, getCurrentSession } from "@/lib/server-auth";
import { recordSecurityEvent, revokeUserSessions } from "@/lib/account-security";

const { isLimitedMock } = vi.hoisted(() => ({
  isLimitedMock: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: vi.fn(),
  getCurrentSession: vi.fn(() => ({ token: "current-token" })),
}));

vi.mock("@/lib/password", () => ({
  hashCredentialPassword: vi.fn().mockResolvedValue("new-hashed-pw"),
  verifyCredentialPassword: vi.fn(),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
  revokeUserSessions: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: isLimitedMock })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("POST /api/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLimitedMock.mockResolvedValue(false);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback({
      account: { update: prisma.account.update },
      user: { update: prisma.user.update },
    } as never) as never);
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(getServerAuthSession).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        currentPassword: "OldPassword1!",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 429 when password changes are rate limited", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);
    isLimitedMock.mockResolvedValueOnce(true);

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        currentPassword: "OldPassword1!",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: "Too many password change attempts. Please try again later.",
    });
    expect(getCurrentSession).not.toHaveBeenCalled();
  });

  it("rejects weak new password", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        currentPassword: "OldPassword1!",
        newPassword: "weak",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects incorrect current password", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({
      id: "acct-1",
      password: "hashed-pw",
    } as never);

    const { verifyCredentialPassword } = await import("@/lib/password");
    vi.mocked(verifyCredentialPassword).mockResolvedValue(false as never);

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        currentPassword: "WrongPassword1!",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Current password is incorrect.",
    });
  });

  it("rejects reusing the same password", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({
      id: "acct-1",
      password: "hashed-pw",
    } as never);

    const { verifyCredentialPassword } = await import("@/lib/password");
    // First call: verify current password (pass)
    // Second call: check if new === old (also pass — password reuse)
    vi.mocked(verifyCredentialPassword)
      .mockResolvedValueOnce(true as never)
      .mockResolvedValueOnce(true as never);

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        currentPassword: "SamePassword1!",
        newPassword: "SamePassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "New password must be different from current password.",
    });
  });

  it("changes password, revokes other sessions, and records event", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);
    vi.mocked(getCurrentSession).mockResolvedValue({
      token: "current-token",
    } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({
      id: "acct-1",
      password: "hashed-pw",
    } as never);

    const { verifyCredentialPassword } = await import("@/lib/password");
    vi.mocked(verifyCredentialPassword)
      .mockResolvedValueOnce(true as never) // current password is correct
      .mockResolvedValueOnce(false as never); // new password is different
    vi.mocked(prisma.account.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(revokeUserSessions).mockResolvedValue(2 as never);

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        currentPassword: "OldPassword1!",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.account.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", providerId: "credential" } }),
    );
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(revokeUserSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        excludeSessionToken: "current-token",
        reason: "password_changed",
      }),
    );
    expect(recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PASSWORD_CHANGED" }),
    );
  });

  it("returns 400 when request body is malformed JSON", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
    } as never);

    const req = new Request("http://localhost/api/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: "not-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body" });
  });
});
