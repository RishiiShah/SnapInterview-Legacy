import type { Prisma, SecurityEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

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
    logger.error("Security event write failed", {
      error: error instanceof Error ? error.message : String(error),
      type,
      hasUserId: Boolean(userId),
      hasEmail: Boolean(email),
    });
  }
}

export async function revokeUserSessions(params: {
  userId: string;
  excludeSessionToken?: string | null;
  reason: "password_changed" | "password_reset" | "manual_revoke";
}) {
  const { userId, excludeSessionToken, reason } = params;
  const now = new Date();

  // Delete sessions atomically so they are immediately invalidated.
  // A single deleteMany avoids the TOCTOU race of findMany-then-deleteMany.
  const { count } = await prisma.session.deleteMany({
    where: {
      userId,
      expiresAt: { gt: now },
      ...(excludeSessionToken ? { token: { not: excludeSessionToken } } : {}),
    },
  });

  if (count === 0) {
    return 0;
  }

  await recordSecurityEvent({
    type: "SESSION_REVOKED",
    userId,
    metadata: { reason, count },
  });

  return count;
}
