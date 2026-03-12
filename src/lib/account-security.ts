import type { Prisma, SecurityEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function recordSecurityEvent(params: {
  type: SecurityEventType;
  userId?: string | null;
  email?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const { type, userId, email, ipHash, userAgent, metadata } = params;

  try {
    await prisma.securityEvent.create({
      data: {
        type,
        userId: userId ?? null,
        email: email ?? null,
        ipHash: ipHash ?? null,
        userAgent: userAgent ?? null,
        metadata,
      },
    });
  } catch (error) {
    console.error("Security event write failed:", error);
  }
}

export async function revokeUserSessions(params: {
  userId: string;
  excludeSessionToken?: string | null;
  reason: "password_changed" | "password_reset" | "manual_revoke";
}) {
  const { userId, excludeSessionToken, reason } = params;
  const now = new Date();

  // Better Auth session table uses `token` and `expiresAt` (not `sessionToken`, `expires`, `revokedAt`)
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: now },
      ...(excludeSessionToken ? { token: { not: excludeSessionToken } } : {}),
    },
    select: {
      id: true,
    },
  });

  if (sessions.length === 0) {
    return 0;
  }

  // Delete sessions so they are immediately invalidated
  await prisma.session.deleteMany({
    where: {
      id: { in: sessions.map((session) => session.id) },
    },
  });

  await recordSecurityEvent({
    type: "SESSION_REVOKED",
    userId,
    metadata: { reason, count: sessions.length },
  });

  return sessions.length;
}