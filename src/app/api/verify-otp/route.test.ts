import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { recordSecurityEvent } from "@/lib/account-security";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/security", () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  verifyOneTimeCode: vi.fn(),
  extractRequestContext: vi.fn(() => ({ ipHash: "hashed-ip", userAgent: "agent" })),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
}));

const { isLimitedMock } = vi.hoisted(() => ({
  isLimitedMock: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: isLimitedMock,
    checkLimit: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      account: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      pendingUser: {
        delete: vi.fn(),
      },
    })),
    pendingUser: {
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("POST /api/verify-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLimitedMock.mockResolvedValue(false);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma));
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", otp: "123456" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("rejects invalid input", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "not-email", otp: "12" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns a generic verification failure when no pending user exists", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid or expired verification code.");
  });

  it("returns a generic verification failure when OTP has expired", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      id: "pending-1",
      email: "user@example.com",
      expiresAt: new Date(Date.now() - 60000),
      otpHash: "hash",
      attemptCount: 0,
      lockedUntil: null,
    } as never);
    vi.mocked(prisma.pendingUser.delete).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid or expired verification code.");
    });

  it("returns a generic verification failure when user is locked out", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      id: "pending-1",
      email: "user@example.com",
      expiresAt: new Date(Date.now() + 300000),
      otpHash: "hash",
      attemptCount: 5,
      lockedUntil: new Date(Date.now() + 600000),
    } as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid or expired verification code.");
  });

  it("increments attempt count without exposing remaining attempts on invalid OTP", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      id: "pending-1",
      email: "user@example.com",
      expiresAt: new Date(Date.now() + 300000),
      otpHash: "hash",
      attemptCount: 0,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(false);
    vi.mocked(prisma.pendingUser.update).mockResolvedValue({ attemptCount: 1 } as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "000000" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid or expired verification code.");
    expect(prisma.pendingUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { attemptCount: { increment: 1 } },
      }),
    );
    expect(recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REGISTRATION_OTP_FAILED" }),
    );
  });

  it("locks the pending user without exposing lockout state when max OTP attempts are reached", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      id: "pending-1",
      email: "user@example.com",
      expiresAt: new Date(Date.now() + 300000),
      otpHash: "hash",
      attemptCount: 4,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(false);
    vi.mocked(prisma.pendingUser.update).mockResolvedValue({ attemptCount: 5 } as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "000000" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid or expired verification code.");
    expect(prisma.pendingUser.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: { attemptCount: { increment: 1 } },
      }),
    );
    expect(prisma.pendingUser.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ lockedUntil: expect.any(Date) }),
      }),
    );
  });

  it("creates user on valid OTP", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      id: "pending-1",
      name: "Test User",
      email: "user@example.com",
      passwordHash: "hashed-pw",
      expiresAt: new Date(Date.now() + 300000),
      otpHash: "hash",
      attemptCount: 0,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
    } as never);
    vi.mocked(prisma.account.create).mockResolvedValue({} as never);
    vi.mocked(prisma.pendingUser.delete).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ id: "user-1", name: "Test User" });
    expect(prisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerId: "credential", password: "hashed-pw" }),
      }),
    );
    expect(recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REGISTRATION_OTP_VERIFIED" }),
    );
  });

  it("recovers an existing user missing a credential account", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      id: "pending-1",
      name: "Recovered User",
      email: "user@example.com",
      passwordHash: "hashed-pw",
      expiresAt: new Date(Date.now() + 300000),
      otpHash: "hash",
      attemptCount: 0,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      name: "Recovered User",
      email: "user@example.com",
    } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      name: "Recovered User",
      email: "user@example.com",
    } as never);
    vi.mocked(prisma.account.create).mockResolvedValue({} as never);
    vi.mocked(prisma.pendingUser.delete).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
      })
    );
    expect(prisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          providerId: "credential",
          password: "hashed-pw",
        }),
      })
    );
    expect(recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "REGISTRATION_OTP_VERIFIED",
        metadata: { recoveredCredentialAccount: true },
      })
    );
  });

  it("returns a generic verification failure when a credential account already exists", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      id: "pending-1",
      name: "Test User",
      email: "user@example.com",
      passwordHash: "hashed-pw",
      expiresAt: new Date(Date.now() + 300000),
      otpHash: "hash",
      attemptCount: 0,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
    } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({ id: "account-1" } as never);
    vi.mocked(prisma.pendingUser.delete).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid or expired verification code.");
    expect(prisma.pendingUser.delete).toHaveBeenCalledWith({ where: { email: "user@example.com" } });
  });

  it("returns a generic verification failure when the email-scoped limiter trips", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);

    // Both limiters share isLimitedMock: the IP limiter is keyed by the IP hash
    // ("hashed-ip") and passes; the email limiter is keyed by the normalized
    // email and trips.
    isLimitedMock.mockImplementation(async (key: string) => key === "user@example.com");

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid or expired verification code.");
    // The limiter short-circuits before any pending-user lookup or mutation.
    expect(prisma.pendingUser.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 when request body is malformed JSON", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);

    const req = new Request("http://localhost/api/verify-otp", {
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
