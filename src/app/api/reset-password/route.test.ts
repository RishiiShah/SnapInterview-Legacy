import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { recordSecurityEvent, revokeUserSessions } from "@/lib/account-security";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/security", () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  verifyOneTimeCode: vi.fn(),
  hashOneTimeCode: vi.fn(() => "hashed-otp"),
}));

vi.mock("@/lib/password", () => ({
  hashCredentialPassword: vi.fn().mockResolvedValue("new-hashed-pw"),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
  revokeUserSessions: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetCode: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("POST /api/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new Request("http://localhost/api/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("rejects invalid input (weak password)", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);

    const req = new Request("http://localhost/api/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "user@example.com",
        otp: "123456",
        newPassword: "weak",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when no reset token exists", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.passwordResetCode.findFirst).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "user@example.com",
        otp: "123456",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 410 when reset code has expired", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.passwordResetCode.findFirst).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      codeHash: "hash",
      expiresAt: new Date(Date.now() - 60000),
      attemptCount: 0,
      lockedUntil: null,
    } as never);
    vi.mocked(prisma.passwordResetCode.updateMany).mockResolvedValue({ count: 1 } as never);

    const req = new Request("http://localhost/api/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "user@example.com",
        otp: "123456",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(410);
  });

  it("increments attempt count on invalid OTP", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.passwordResetCode.findFirst).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      codeHash: "hash",
      expiresAt: new Date(Date.now() + 300000),
      attemptCount: 0,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(false);
    vi.mocked(prisma.passwordResetCode.update).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "user@example.com",
        otp: "000000",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(prisma.passwordResetCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attemptCount: 1 }),
      }),
    );
  });

  it("resets password and revokes sessions on valid OTP", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.passwordResetCode.findFirst).mockResolvedValue({
      id: "token-1",
      email: "user@example.com",
      codeHash: "hash",
      expiresAt: new Date(Date.now() + 300000),
      attemptCount: 0,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
    } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({
      id: "acct-1",
      password: "old-hash",
    } as never);
    vi.mocked(prisma.account.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.passwordResetCode.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.passwordResetCode.update).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "user@example.com",
        otp: "123456",
        newPassword: "NewPassword1!",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(revokeUserSessions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", reason: "password_reset" }),
    );
    expect(recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PASSWORD_RESET_COMPLETED" }),
    );
  });
});
