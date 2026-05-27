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

export async function requireAdminSession() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/dashboard");
  }

  return session;
}
