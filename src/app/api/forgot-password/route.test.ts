import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { logger } from "@/utils/logger";

const { isLimitedMock } = vi.hoisted(() => ({
  isLimitedMock: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: isLimitedMock,
    checkLimit: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/security", () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  extractRequestContext: vi.fn(() => ({ ipHash: "ip-hash", userAgent: "test-agent" })),
  generateNumericCode: vi.fn(() => "123456"),
  hashOneTimeCode: vi.fn(() => "hashed-otp"),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendOtpEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
    },
    passwordResetCode: {
      count: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("POST /api/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLimitedMock.mockResolvedValue(false);
  });

  it("returns success even when OTP email delivery fails", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1", email: "user@example.com" } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({ id: "acct-1" } as never);
    vi.mocked(prisma.passwordResetCode.count).mockResolvedValue(0);
    vi.mocked(prisma.passwordResetCode.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.passwordResetCode.create).mockResolvedValue({ id: "prc-1" } as never);
    vi.mocked(sendOtpEmail).mockRejectedValue(new Error("smtp down"));

    const request = new Request("http://localhost/api/forgot-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "If an account with that email exists, a reset code has been sent.",
    });

    expect(errorSpy).toHaveBeenCalledWith("Failed to send password reset email:", expect.objectContaining({
      error: "smtp down"
    }));
  });

  it("returns the same generic success when an existing account has recent reset requests", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1", email: "user@example.com" } as never);
    vi.mocked(prisma.account.findFirst).mockResolvedValue({ id: "acct-1" } as never);
    vi.mocked(prisma.passwordResetCode.count).mockResolvedValue(3);

    const request = new Request("http://localhost/api/forgot-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "user@example.com" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "If an account with that email exists, a reset code has been sent.",
    });
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });
});
