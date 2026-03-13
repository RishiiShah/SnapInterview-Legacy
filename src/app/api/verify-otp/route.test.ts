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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pendingUser: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    account: {
      create: vi.fn(),
    },
  },
}));

describe("POST /api/verify-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns 404 when no pending user exists", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findFirst).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "123456" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 410 when OTP has expired", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findFirst).mockResolvedValue({
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
    expect(res.status).toBe(410);
  });

  it("returns 429 when user is locked out", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findFirst).mockResolvedValue({
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
    expect(res.status).toBe(429);
  });

  it("increments attempt count on invalid OTP", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findFirst).mockResolvedValue({
      id: "pending-1",
      email: "user@example.com",
      expiresAt: new Date(Date.now() + 300000),
      otpHash: "hash",
      attemptCount: 0,
      lockedUntil: null,
    } as never);

    const { verifyOneTimeCode } = await import("@/lib/security");
    vi.mocked(verifyOneTimeCode).mockReturnValue(false);
    vi.mocked(prisma.pendingUser.update).mockResolvedValue({} as never);

    const req = new Request("http://localhost/api/verify-otp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com", otp: "000000" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(prisma.pendingUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ attemptCount: 1 }),
      }),
    );
    expect(recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "REGISTRATION_OTP_FAILED" }),
    );
  });

  it("creates user on valid OTP", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(prisma.pendingUser.findFirst).mockResolvedValue({
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
    vi.mocked(prisma.pendingUser.deleteMany).mockResolvedValue({ count: 1 } as never);

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
});
