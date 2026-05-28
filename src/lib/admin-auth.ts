import { cache } from "react";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { getServerAuthSession } from "@/lib/server-auth";
import { normalizeEmail } from "@/lib/security";

function getAdminAllowlist(): Set<string> {
  if (!env.ADMIN_EMAILS) {
    return new Set();
  }

  return new Set(
    env.ADMIN_EMAILS.split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return getAdminAllowlist().has(normalizeEmail(email));
}

export const getAdminSessionOrNull = cache(async function getAdminSessionOrNull() {
  const session = await getServerAuthSession();
  if (!session?.user || !isAdminEmail(session.user.email)) {
    return null;
  }
  return session;
});

export const requireAdminSession = cache(async function requireAdminSession() {
  const session = await getAdminSessionOrNull();

  if (!session) {
    const authSession = await getServerAuthSession();
    redirect(authSession?.user ? "/dashboard" : "/login");
  }

  return session;
});
