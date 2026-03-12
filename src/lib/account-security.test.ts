import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordSecurityEvent, revokeUserSessions } from "./account-security";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
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
    vi.mocked(prisma.session.findMany).mockResolvedValue(
      [{ id: "s1" }, { id: "s2" }] as Awaited<ReturnType<typeof prisma.session.findMany>>
    );

    const revokedCount = await revokeUserSessions({
      userId: "user-1",
      excludeSessionToken: "keep-me",
      reason: "manual_revoke",
    });

    expect(revokedCount).toBe(2);
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["s1", "s2"] },
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

  it("returns zero when there are no active sessions to revoke", async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([]);

    await expect(
      revokeUserSessions({
        userId: "user-1",
        reason: "password_reset",
      })
    ).resolves.toBe(0);

    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    expect(prisma.securityEvent.create).not.toHaveBeenCalled();
  });
});
