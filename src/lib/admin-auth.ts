import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/server-auth";

export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  return user?.isAdmin ?? false;
}

const getCachedIsAdmin = cache(isAdminUser);

function getSessionUserId(session: NonNullable<Awaited<ReturnType<typeof getServerAuthSession>>>) {
  return session.user?.id ?? session.session?.userId ?? null;
}

export const getAdminSessionOrNull = cache(async function getAdminSessionOrNull() {
  const session = await getServerAuthSession();
  const userId = session ? getSessionUserId(session) : null;

  if (!userId || !(await getCachedIsAdmin(userId))) {
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
