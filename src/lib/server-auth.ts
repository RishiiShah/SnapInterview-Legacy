import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/security";

export type SessionUserIdentity = {
  userId: string;
  email: string | null;
};

/**
 * Returns the full Better Auth session for use in Server Components/Route Handlers.
 */
export async function getServerAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

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
