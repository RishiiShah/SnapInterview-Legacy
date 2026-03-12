import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendResetPasswordLinkEmail } from "@/lib/email";

const betterAuthMock = vi.fn(() => ({
  $Infer: {
    Session: {
      user: {},
    },
  },
}));

vi.mock("better-auth", () => ({
  betterAuth: betterAuthMock,
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => ({})),
}));

vi.mock("better-auth/api", () => ({
  createAuthMiddleware: vi.fn((fn) => fn),
  APIError: class MockAPIError extends Error {
    constructor(code: string, options?: { message?: string }) {
      super(options?.message || code);
      this.name = code;
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: vi.fn(() => false) })),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/security", () => ({
  extractRequestContext: vi.fn(() => ({ ipHash: "ip", userAgent: "ua" })),
  normalizeEmail: vi.fn((value: string) => value.trim().toLowerCase()),
}));

vi.mock("@/lib/email", () => ({
  sendResetPasswordLinkEmail: vi.fn(),
}));

describe("auth reset password callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("wires Better Auth reset callback to email helper", async () => {
    await import("./auth");

    const calls = (betterAuthMock as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const rawConfig = calls[0]?.[0];
    expect(rawConfig).toBeDefined();

    const config = rawConfig as unknown as {
      emailAndPassword: {
        sendResetPassword: (params: { user: { email: string }; url: string }) => Promise<void>;
      };
    };

    await config.emailAndPassword.sendResetPassword({
      user: { email: "User@Example.com " },
      url: "https://snapinterview.app/reset?token=abc",
    });

    expect(sendResetPasswordLinkEmail).toHaveBeenCalledWith(
      "user@example.com",
      "https://snapinterview.app/reset?token=abc"
    );
  });
});
