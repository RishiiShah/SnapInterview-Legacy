import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { recordSecurityEvent } from "@/lib/account-security";
import { extractRequestContext, normalizeEmail } from "@/lib/security";

const loginLimiter = createRateLimiter(60 * 1000, 5);
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ─── Session Config ───
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days
    updateAge: 60 * 60 * 24,        // refresh expiry once per day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5-minute cookie cache to reduce DB fetches on every request
    },
  },

  // ─── Email & Password ───
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    async sendResetPassword() {
      // TODO: wire up to an email provider
    },
  },

  // ─── Social OAuth ───
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      prompt: "select_account",
    },
  },

  // ─── Additional user fields ───
  user: {
    additionalFields: {
      isFirstLogin: {
        type: "boolean",
        defaultValue: true,
        input: false,
      },
      onboardingCompletedAt: {
        type: "date",
        required: false,
        input: false,
      },
      onboardingRole: {
        type: "string",
        required: false,
        input: false,
      },
      onboardingLevel: {
        type: "string",
        required: false,
        input: false,
      },
      onboardingCompany: {
        type: "string",
        required: false,
        input: false,
      },
      onboardingGoal: {
        type: "string",
        required: false,
        input: false,
      },
      preferredInterviewType: {
        type: "string",
        required: false,
        input: false,
      },
      notificationPrefs: {
        type: "string",
        defaultValue: JSON.stringify({
          emailNotifs: true,
          practiceReminders: true,
          weeklyReport: true,
          scoreAlerts: false,
        }),
        input: false,
      },
    },
  },

  // ─── Hooks for rate limiting, lockout, and security event recording ───
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const body = ctx.body as { email?: string } | undefined;
      const email = body?.email ? normalizeEmail(body.email) : null;
      if (!email) return;

      const ipHash = ctx.request
        ? extractRequestContext(ctx.request.headers).ipHash
        : undefined;
      const userAgent = ctx.request
        ? extractRequestContext(ctx.request.headers).userAgent
        : undefined;

      // In-memory rate limit check
      if (loginLimiter.isLimited(email)) {
        await recordSecurityEvent({
          type: "LOGIN_FAILED",
          email,
          ipHash,
          userAgent,
          metadata: { reason: "rate_limited" },
        });
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many login attempts. Please try again later.",
        });
      }

      // Database-level lockout check
      const user = await prisma.user.findUnique({ where: { email } });
      if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        await recordSecurityEvent({
          type: "LOGIN_FAILED",
          userId: user.id,
          email,
          ipHash,
          userAgent,
          metadata: { reason: "locked" },
        });
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many login attempts. Please try again later.",
        });
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      const ipHash = ctx.request
        ? extractRequestContext(ctx.request.headers).ipHash
        : undefined;
      const userAgent = ctx.request
        ? extractRequestContext(ctx.request.headers).userAgent
        : undefined;

      // ── Email sign-in success/failure tracking ──
      if (ctx.path === "/sign-in/email") {
        const body = ctx.body as { email?: string } | undefined;
        const email = body?.email ? normalizeEmail(body.email) : null;
        if (!email) return;

        const isSuccess = !!(ctx as any).context?.session;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return;

        if (!isSuccess) {
          const failedLoginCount = user.failedLoginCount + 1;
          const lockedUntil =
            failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS
              ? new Date(Date.now() + LOGIN_LOCK_MS)
              : null;
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginCount, lockedUntil },
          });
          await recordSecurityEvent({
            type: "LOGIN_FAILED",
            userId: user.id,
            email,
            ipHash,
            userAgent,
            metadata: {
              reason: "invalid_credentials",
              remainingAttempts: Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - failedLoginCount),
            },
          });
        } else {
          if (user.failedLoginCount !== 0 || user.lockedUntil) {
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginCount: 0, lockedUntil: null },
            });
          }
          await recordSecurityEvent({
            type: "LOGIN_SUCCESS",
            userId: user.id,
            email,
            ipHash,
            userAgent,
            metadata: { provider: "credentials" },
          });
        }
        return;
      }

      // ── Social sign-in success tracking ──
      if (ctx.path === "/sign-in/social") {
        const provider = (ctx.body as { provider?: string } | undefined)?.provider;
        const sessionUser = (ctx as any).context?.session?.user;
        if (!sessionUser?.email || !provider) return;
        await recordSecurityEvent({
          type: "LOGIN_SUCCESS",
          userId: sessionUser.id,
          email: normalizeEmail(sessionUser.email),
          ipHash,
          userAgent,
          metadata: { provider },
        });
      }
    }),
  },

  secret: process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user;
