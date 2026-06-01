import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSessionCookieCacheVersion,
  recordSecurityEvent,
  revokeUserSessions,
} from "./account-security";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
    securityEvent: {
      create: vi.fn(),
    },
  },
}));
describe("account-security helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records security events with nullable fields normalized", async () => {
    await recordSecurityEvent({
      type: "LOGIN_SUCCESS",
      userId: undefined,
      email: undefined,
      ipHash: undefined,
      userAgent: undefined,
    });

    expect(prisma.securityEvent.create).toHaveBeenCalledWith({
      data: {
        type: "LOGIN_SUCCESS",
        userId: null,
        email: null,
        ipHash: null,
        userAgent: null,
        metadata: undefined,
      },
    });
  });

  it("revokes matching sessions and records a summary security event", async () => {
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 2 });

    const revokedCount = await revokeUserSessions({
      userId: "user-1",
      excludeSessionToken: "keep-me",
      reason: "manual_revoke",
    });

    expect(revokedCount).toBe(2);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
        token: { not: "keep-me" },
      },
    });
    expect(prisma.securityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "SESSION_REVOKED",
        userId: "user-1",
        metadata: { reason: "manual_revoke", count: 2 },
      }),
    });
  });

  it("records admin audit metadata when an admin revokes sessions", async () => {
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 3 });

    await revokeUserSessions({
      userId: "user-1",
      email: "user@example.com",
      reason: "admin_revoke",
      auditMetadata: {
        adminReason: "suspicious activity",
        adminUserId: "admin-1",
        adminEmail: "admin@example.com",
      },
    });

    expect(prisma.securityEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "SESSION_REVOKED",
        userId: "user-1",
        email: "user@example.com",
        metadata: {
          reason: "admin_revoke",
          count: 3,
          adminReason: "suspicious activity",
          adminUserId: "admin-1",
          adminEmail: "admin@example.com",
        },
      }),
    });
  });

  it("returns revoked when the cached session token no longer exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ lockedUntil: null });
    vi.mocked(prisma.session.findFirst).mockResolvedValue(null);

    await expect(
      getSessionCookieCacheVersion({ token: "revoked-token" }, { id: "user-1" }),
    ).resolves.toBe("revoked");
  });

  it("returns locked when the account is locked", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      getSessionCookieCacheVersion({ token: "token-1" }, { id: "user-1" }),
    ).resolves.toBe("locked");

    expect(prisma.session.findFirst).not.toHaveBeenCalled();
  });

  it("returns zero when there are no active sessions to revoke", async () => {
    vi.mocked(prisma.session.deleteMany).mockResolvedValue({ count: 0 });

    await expect(
      revokeUserSessions({
        userId: "user-1",
        reason: "password_reset",
      })
    ).resolves.toBe(0);

    expect(prisma.session.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.securityEvent.create).not.toHaveBeenCalled();
  });
});
