import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export type SessionUserIdentity = {
  userId: string;
  email: string | null;
};

export async function getSessionUserIdentity(): Promise<SessionUserIdentity | null> {
  const session = await getServerSession();
  const sessionUserId = session?.user?.id;
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;

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
