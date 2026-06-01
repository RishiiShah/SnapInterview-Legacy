import type { Prisma, SecurityEventType } from "@/generated/prisma/client";
import { isAccountLocked } from "@/lib/account-lock";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

/** Bust Better Auth cookie cache when an account is locked or sessions were revoked. */
export async function getSessionCookieCacheVersion(
  session: { token?: string },
  user: { id: string },
): Promise<string> {
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { lockedUntil: true },
  });
  if (isAccountLocked(userRecord?.lockedUntil)) {
    return "locked";
  }

  const token = session.token;
  if (!token) {
    return "invalid";
  }

  const activeSession = await prisma.session.findFirst({
    where: {
      token,
      userId: user.id,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  return activeSession ? "1" : "revoked";
}

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

export type SessionRevokeReason =
  | "password_changed"
  | "password_reset"
  | "manual_revoke"
  | "account_locked"
  | "admin_revoke";

export async function revokeUserSessions(params: {
  userId: string;
  excludeSessionToken?: string | null;
  reason: SessionRevokeReason;
  email?: string | null;
  auditMetadata?: Prisma.InputJsonValue;
}) {
  const { userId, excludeSessionToken, reason, email, auditMetadata } = params;
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
    email: email ?? null,
    metadata: {
      reason,
      count,
      ...(auditMetadata && typeof auditMetadata === "object" && !Array.isArray(auditMetadata)
        ? auditMetadata
        : {}),
    },
  });

  return count;
}
