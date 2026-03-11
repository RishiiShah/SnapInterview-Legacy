import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createRateLimiter } from "@/lib/rate-limit";
import { recordSecurityEvent } from "@/lib/account-security";
import { mapAuthUserFields } from "@/lib/auth-user";
import { extractRequestContext, normalizeEmail } from "@/lib/security";

const loginLimiter = createRateLimiter(60 * 1000, 5);
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const emailKey = normalizeEmail(credentials.email);
        const { ipHash, userAgent } = extractRequestContext(request?.headers);

        if (loginLimiter.isLimited(emailKey)) {
          await recordSecurityEvent({
            type: "LOGIN_FAILED",
            email: emailKey,
            ipHash,
            userAgent,
            metadata: { reason: "rate_limited" },
          });
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({
          where: { email: emailKey },
        });

        if (user?.lockedUntil && user.lockedUntil > new Date()) {
          await recordSecurityEvent({
            type: "LOGIN_FAILED",
            userId: user.id,
            email: user.email,
            ipHash,
            userAgent,
            metadata: { reason: "locked" },
          });
          throw new Error("Too many login attempts. Please try again later.");
        }

        if (!user || !user.passwordHash) {
          await recordSecurityEvent({
            type: "LOGIN_FAILED",
            email: emailKey,
            ipHash,
            userAgent,
            metadata: { reason: "invalid_credentials" },
          });
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          const failedLoginCount = user.failedLoginCount + 1;
          const lockedUntil =
            failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS
              ? new Date(Date.now() + LOGIN_LOCK_MS)
              : null;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount,
              lockedUntil,
            },
          });

          await recordSecurityEvent({
            type: "LOGIN_FAILED",
            userId: user.id,
            email: user.email,
            ipHash,
            userAgent,
            metadata: {
              reason: "invalid_credentials",
              remainingAttempts: Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - failedLoginCount),
            },
          });

          throw new Error("Invalid email or password");
        }

        if (user.failedLoginCount !== 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: 0,
              lockedUntil: null,
            },
          });
        }

        await recordSecurityEvent({
          type: "LOGIN_SUCCESS",
          userId: user.id,
          email: user.email,
          ipHash,
          userAgent,
          metadata: { provider: "credentials" },
        });

        return mapAuthUserFields(user);
      },
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (user?.id && account?.provider === "google") {
        await recordSecurityEvent({
          type: "LOGIN_SUCCESS",
          userId: user.id,
          email: user.email,
          metadata: { provider: account.provider },
        });
      }

      return true;
    },
    async session({ session, user, trigger, newSession }) {
      if (session.user) {
        Object.assign(
          session.user,
          mapAuthUserFields(user as Parameters<typeof mapAuthUserFields>[0], {
            name: trigger === "update" && typeof newSession?.name === "string" ? newSession.name : user.name,
          })
        );
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
