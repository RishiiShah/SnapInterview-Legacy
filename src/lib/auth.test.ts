import { beforeEach, describe, expect, it, vi } from "vitest";

const betterAuthMock = vi.fn(() => ({
  $Infer: {
    Session: {
      user: {},
    },
  },
}));

const prismaMocks = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
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
  prisma: prismaMocks,
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: vi.fn(() => Promise.resolve(false)) })),
}));

vi.mock("@/lib/account-security", () => ({
  recordSecurityEvent: vi.fn(),
  revokeUserSessions: vi.fn(),
}));

vi.mock("@/lib/security", () => ({
  extractRequestContext: vi.fn(() => ({ ipHash: "ip", userAgent: "ua" })),
  normalizeEmail: vi.fn((value: string) => value.trim().toLowerCase()),
}));

vi.mock("@/lib/password", () => ({
  hashCredentialPassword: vi.fn(),
  verifyCredentialPassword: vi.fn(),
}));

describe("auth configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("keeps credential hashing configured without Better Auth reset-link wiring", async () => {
    await import("./auth");

    const calls = (betterAuthMock as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const rawConfig = calls[0]?.[0];
    expect(rawConfig).toBeDefined();

    const config = rawConfig as {
      emailAndPassword: {
        password: {
          hash: unknown;
          verify: unknown;
        };
        sendResetPassword?: unknown;
      };
      session: {
        cookieCache: {
          enabled: boolean;
          version?: unknown;
        };
      };
    };

    expect(config.emailAndPassword.password.hash).toBeDefined();
    expect(config.emailAndPassword.password.verify).toBeDefined();
    expect(config.emailAndPassword.sendResetPassword).toBeUndefined();
    expect(config.session.cookieCache.enabled).toBe(true);
    // No version() callback — it defeated the cache; lock/revocation is enforced by the after-hook.
    expect(config.session.cookieCache.version).toBeUndefined();
  });

  it("increments failed-login attempts atomically before recording the failure", async () => {
    prismaMocks.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      failedLoginCount: 4,
      lockedUntil: null,
    });
    prismaMocks.user.update
      .mockResolvedValueOnce({ failedLoginCount: 5 })
      .mockResolvedValueOnce({ id: "user-1" });

    await import("./auth");
    const config = (betterAuthMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as {
      hooks: { after: (context: unknown) => Promise<void> };
    };

    await config.hooks.after({
      path: "/sign-in/email",
      body: { email: "USER@example.com" },
      request: new Request("https://snapinterview.test/api/auth/sign-in/email"),
      context: { newSession: null },
    });

    expect(prismaMocks.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: "user-1" },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    expect(prismaMocks.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: "user-1" },
      data: { lockedUntil: expect.any(Date) },
    });
  });
});
