import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import {
  getSessionCookieCacheVersion,
  recordSecurityEvent,
  revokeUserSessions,
} from "@/lib/account-security";
import { ACCOUNT_LOCKED_MESSAGE, isAccountLocked } from "@/lib/account-lock";
import {
  type AuthAfterHookContext,
  getSignInAfterHookUser,
  isSignInAfterHookSuccess,
} from "@/lib/auth-sign-in-success";
import { extractRequestContext, normalizeEmail } from "@/lib/security";
import { hashCredentialPassword, verifyCredentialPassword } from "@/lib/password";
import { env } from "@/lib/env";

const loginLimiter = createRateLimiter("login", 60 * 1000, 5);
const loginIpLimiter = createRateLimiter("login_ip", 60 * 1000, 15);
const loginIpBanLimiter = createRateLimiter("login_ip_ban", 60 * 1000, 50);
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

async function rejectLockedAccount(params: {
  user: { id: string; lockedUntil: Date | null };
  email: string;
  ipHash?: string;
  userAgent?: string;
}) {
  if (!isAccountLocked(params.user.lockedUntil)) {
    return;
  }

  await recordSecurityEvent({
    type: "LOGIN_FAILED",
    userId: params.user.id,
    email: params.email,
    ipHash: params.ipHash,
    userAgent: params.userAgent,
    metadata: { reason: "locked" },
  });

  throw new APIError("FORBIDDEN", {
    message: ACCOUNT_LOCKED_MESSAGE,
  });
}

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
      version: async (_session, user) => getSessionCookieCacheVersion(user.id),
    },
  },

  // ─── Email & Password ───
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: hashCredentialPassword,
      verify: verifyCredentialPassword,
    },
  },

  // ─── Social OAuth ───
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
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

  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const userId = String(session.userId ?? "");
          if (!userId) return;

          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, lockedUntil: true },
          });
          if (!user) return;

          await rejectLockedAccount({
            user,
            email: normalizeEmail(user.email),
          });
        },
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

      // 1. Check IP Ban Limit (Tarpit) - Consumes a token for ALL attempts
      if (ipHash && await loginIpBanLimiter.isLimited(ipHash)) {
        await recordSecurityEvent({
          type: "LOGIN_FAILED",
          email,
          ipHash,
          userAgent,
          metadata: { reason: "ip_tarpit_triggered" },
        });

        // Randomized delay 5-30s
        const delayMs = 5000 + Math.random() * 25000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many login attempts. Please try again later.",
        });
      }

      // 2. Check Primary IP Limit (Failures only) - Peek without consuming
      if (ipHash && await loginIpLimiter.checkLimit(ipHash)) {
        await recordSecurityEvent({
          type: "LOGIN_FAILED",
          email,
          ipHash,
          userAgent,
          metadata: { reason: "ip_rate_limited" },
        });
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many login attempts. Please try again later.",
        });
      }

      // 3. Distributed Postgres-backed email rate limit check.
      if (await loginLimiter.isLimited(email)) {
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
      if (user) {
        await rejectLockedAccount({
          user,
          email,
          ipHash: ipHash ?? undefined,
          userAgent: userAgent ?? undefined,
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

        const hookContext = (ctx as { context?: AuthAfterHookContext }).context;
        const isSuccess = isSignInAfterHookSuccess(hookContext);
        
        // Consume IP rate limit token ONLY on failure
        if (!isSuccess && ipHash) {
          await loginIpLimiter.isLimited(ipHash);
        }

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
          const updates: { failedLoginCount?: number; lockedUntil?: null } = {};
          if (user.failedLoginCount !== 0) {
            updates.failedLoginCount = 0;
          }
          if (user.lockedUntil && !isAccountLocked(user.lockedUntil)) {
            updates.lockedUntil = null;
          }
          if (Object.keys(updates).length > 0) {
            await prisma.user.update({
              where: { id: user.id },
              data: updates,
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

      // ── Social sign-in success tracking (OAuth callback creates newSession) ──
      if (ctx.path.startsWith("/callback/")) {
        const provider = ctx.path.split("/").pop();
        const sessionUser = getSignInAfterHookUser(
          (ctx as { context?: AuthAfterHookContext }).context,
        );
        if (!sessionUser?.id || !sessionUser.email || !provider) return;

        const user = await prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { id: true, email: true, lockedUntil: true },
        });
        if (!user) return;

        if (isAccountLocked(user.lockedUntil)) {
          await revokeUserSessions({ userId: user.id, reason: "account_locked" });
          await recordSecurityEvent({
            type: "LOGIN_FAILED",
            userId: user.id,
            email: normalizeEmail(user.email),
            ipHash,
            userAgent,
            metadata: { reason: "locked", provider },
          });
          return;
        }

        await recordSecurityEvent({
          type: "LOGIN_SUCCESS",
          userId: sessionUser.id,
          email: normalizeEmail(sessionUser.email),
          ipHash,
          userAgent,
          metadata: { provider },
        });
        return;
      }

      // Initiating social sign-in returns an OAuth URL — no session yet.
      if (ctx.path === "/sign-in/social") {
        return;
      }

      // ── Reject cached or DB sessions for locked accounts (prevents login ↔ dashboard loop) ──
      if (ctx.path === "/get-session") {
        const returned = (ctx as {
          context?: { returned?: { user?: { id?: string } } | null };
        }).context?.returned;
        const userId = returned?.user?.id;
        if (!userId) return;

        const lockState = await prisma.user.findUnique({
          where: { id: userId },
          select: { lockedUntil: true },
        });
        if (!isAccountLocked(lockState?.lockedUntil)) return;

        await revokeUserSessions({ userId, reason: "account_locked" });
        if (ctx.request) {
          await auth.api.signOut({ headers: ctx.request.headers });
        }
        return { response: null };
      }
    }),
  },

  secret: env.AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: [
    env.BETTER_AUTH_URL,
    env.APP_URL,
    env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
  ]
    .filter((url): url is string => Boolean(url))
    .map((url) => {
      try {
        return new URL(url).origin.toLowerCase();
      } catch {
        // Fail closed: invalid URLs are silently excluded from the allowlist
        return null;
      }
    })
    .filter((origin): origin is string => Boolean(origin)),
});

export type Session = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user;
