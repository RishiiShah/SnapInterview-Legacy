import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";

import { prisma } from "@/lib/prisma";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { sendOtpEmail } from "@/lib/email";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { extractRequestContext } from "@/lib/security";

vi.mock("@/lib/password", () => ({
  hashCredentialPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/disposable-emails", () => ({
  isDisposableEmail: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn(),
}));

vi.mock("@/lib/security", () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  extractRequestContext: vi.fn(() => ({ ipHash: "hashed-ip", userAgent: "agent" })),
  generateNumericCode: vi.fn(() => "123456"),
  hashOneTimeCode: vi.fn(() => "hashed-otp"),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    pendingUser: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("POST /api/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const request = new Request("http://localhost/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(request);

    expect(res.status).toBe(403);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("blocks disposable email addresses", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(isDisposableEmail).mockResolvedValue({ disposable: true } as never);

    const request = new Request("http://localhost/api/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        name: "Test User",
        email: "temp@example.com",
        password: "Password1!",
      }),
    });

    const res = await POST(request);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Temporary email services are not allowed"),
    });
  });

  it("rate limits repeated requests from the same IP hash", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(isDisposableEmail).mockResolvedValue({ disposable: false } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.pendingUser.upsert).mockResolvedValue({ id: "pending-1" } as never);
    vi.mocked(sendOtpEmail).mockResolvedValue(undefined as never);

    const makeRequest = () =>
      POST(
        new Request("http://localhost/api/register", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({
            name: "Test User",
            email: "user@example.com",
            password: "Password1!",
          }),
        }),
      );

    let sawRateLimit = false;
    for (let i = 0; i < 10; i++) {
      const res = await makeRequest();
      if (res.status === 429) {
        sawRateLimit = true;
        const body = await res.json();
        expect(body).toMatchObject({
          error: "Too many requests. Please try again later.",
        });
        break;
      } else {
        expect(res.status).toBe(200);
      }
    }

    expect(sawRateLimit).toBe(true);

    expect(extractRequestContext).toHaveBeenCalled();
  });

  it("throttles OTP resend when a recent pending user exists", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(isDisposableEmail).mockResolvedValue({ disposable: false } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    // Use a different ipHash so this test is not affected by prior rate-limit usage
    vi.mocked(extractRequestContext).mockReturnValue({
      ipHash: "otp-hash",
      userAgent: "agent",
    } as never);

    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue({
      lastOtpSentAt: new Date(Date.now() - 30 * 1000),
    } as never);

    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Test User",
          email: "user@example.com",
          password: "Password1!",
        }),
      }),
    );

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining("Please wait before requesting another verification code"),
    });
  });

  it("upserts a single pending registration record per email", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(isDisposableEmail).mockResolvedValue({ disposable: false } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(extractRequestContext).mockReturnValue({
      ipHash: "upsert-hash",
      userAgent: "agent",
    } as never);
    vi.mocked(prisma.pendingUser.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.pendingUser.upsert).mockResolvedValue({ id: "pending-1" } as never);
    vi.mocked(sendOtpEmail).mockResolvedValue(undefined as never);

    const res = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Test User",
          email: "user@example.com",
          password: "Password1!",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(prisma.pendingUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "user@example.com" },
        update: expect.objectContaining({
          name: "Test User",
          userId: null,
        }),
        create: expect.objectContaining({
          name: "Test User",
          email: "user@example.com",
        }),
      }),
    );
  });
});
