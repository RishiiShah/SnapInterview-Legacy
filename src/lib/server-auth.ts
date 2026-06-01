import { cache } from "react";

import { auth } from "@/lib/auth";
import { revokeUserSessions } from "@/lib/account-security";
import { isAccountLocked } from "@/lib/account-lock";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/security";
import { getE2ETestIdentity } from "@/lib/test-auth";

export type SessionUserIdentity = {
  userId: string;
  email: string | null;
};

/**
 * Returns the full Better Auth session for use in Server Components/Route Handlers.
 * Cached per request so layout + pages + actions share one session lookup.
 */
export const getServerAuthSession = cache(async function getServerAuthSession() {
  const testIdentity = await getE2ETestIdentity();
  if (testIdentity) {
    const user = await prisma.user.findUnique({
      where: { id: testIdentity.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        isFirstLogin: true,
        notificationPrefs: true,
        onboardingCompletedAt: true,
        onboardingRole: true,
        onboardingLevel: true,
        onboardingCompany: true,
        onboardingGoal: true,
        preferredInterviewType: true,
      },
    });

    return {
      user: {
        id: user?.id ?? testIdentity.userId,
        name: user?.name ?? "E2E User",
        email: normalizeEmail(user?.email ?? testIdentity.email),
        image: user?.image ?? null,
        createdAt: user?.createdAt ?? new Date(0),
        updatedAt: user?.updatedAt ?? new Date(0),
        emailVerified: user?.emailVerified ?? true,
        isFirstLogin: user?.isFirstLogin ?? false,
        notificationPrefs: typeof user?.notificationPrefs === "string" ? user.notificationPrefs : JSON.stringify(user?.notificationPrefs ?? {}),
        onboardingCompletedAt: user?.onboardingCompletedAt ?? testIdentity.onboardingCompletedAt ?? null,
        onboardingRole: user?.onboardingRole ?? null,
        onboardingLevel: user?.onboardingLevel ?? null,
        onboardingCompany: user?.onboardingCompany ?? null,
        onboardingGoal: user?.onboardingGoal ?? null,
        preferredInterviewType: user?.preferredInterviewType ?? null,
      },
      session: {
        id: `e2e-session-${user?.id ?? testIdentity.userId}`,
        token: null,
        userId: user?.id ?? testIdentity.userId,
      },
    };
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id ?? session?.session?.userId ?? null;
  const sessionToken = session?.session?.token ?? null;

  if (userId && sessionToken) {
    const activeSession = await prisma.session.findFirst({
      where: {
        token: sessionToken,
        userId,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!activeSession) {
      await auth.api.signOut({ headers: await headers() });
      return null;
    }
  }

  if (userId) {
    const lockState = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true },
    });
    if (isAccountLocked(lockState?.lockedUntil)) {
      await revokeUserSessions({ userId, reason: "account_locked" });
      await auth.api.signOut({ headers: await headers() });
      return null;
    }
  }

  return session;
});

/**
 * Returns a lightweight { userId, email } identity object for use in API routes.
 * Returns null if the user is not authenticated.
 */
export async function getSessionUserIdentity(): Promise<SessionUserIdentity | null> {
  const session = await getServerAuthSession();

  const userId = session?.user?.id ?? session?.session?.userId ?? null;
  if (!userId) {
    return null;
  }

  return {
    userId,
    email: session?.user?.email ? normalizeEmail(session.user.email) : null,
  };
}

/**
 * Looks up the current session token from the DB so we can track or revoke it.
 * Used in the Security settings API route.
 */
export async function getCurrentSession() {
  const session = await getServerAuthSession();
  return session?.session ?? null;
}
