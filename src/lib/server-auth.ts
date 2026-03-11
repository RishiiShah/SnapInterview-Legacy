import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/security";

export type SessionUserIdentity = {
  userId: string;
  email: string | null;
};

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export async function getSessionUserIdentity(): Promise<SessionUserIdentity | null> {
  const session = await getServerAuthSession();
  const sessionUserId = session?.user?.id;
  const sessionEmail = session?.user?.email ? normalizeEmail(session.user.email) : null;

  if (sessionUserId) {
    return { userId: sessionUserId, email: sessionEmail };
  }

  if (!sessionEmail) {
    return null;
  }

  // Fallback for legacy sessions that have email but no user id.
  const user = await prisma.user.findUnique({
    where: { email: sessionEmail },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  return { userId: user.id, email: sessionEmail };
}
