import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordSecurityEvent } from "@/lib/account-security";
import { apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity, getCurrentSession } from "@/lib/server-auth";
import {
  buildUserSecurityActivity,
  groupActiveSessionsByDevice,
  userAgentFromDeviceKey,
} from "@/lib/security-activity";
import { headers } from "next/headers";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";
import { mapWithConcurrency } from "@/lib/async";

const securityActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke"), sessionId: z.string().min(1) }),
  z.object({ action: z.literal("revokeOthers") }),
  z.object({
    action: z.literal("revokeDevice"),
    deviceKey: z.string().min(1),
  }),
]);

const ACTIVITY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_REVOCATION_CONCURRENCY = 5;

async function revokeSessionsByIds(params: {
  sessionIds: string[];
  userId: string;
  currentSessionId: string | undefined;
}) {
  const { sessionIds, userId, currentSessionId } = params;
  const requestHeaders = await headers();

  const targets = await prisma.session.findMany({
    where: {
      id: { in: sessionIds },
      userId,
      ...(currentSessionId ? { NOT: { id: currentSessionId } } : {}),
    },
    select: { id: true, token: true },
  });

  await mapWithConcurrency(targets, SESSION_REVOCATION_CONCURRENCY, (target) =>
    auth.api.revokeSession({
      headers: requestHeaders,
      body: { token: target.token },
    }),
  );

  return targets.length;
}

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const currentSession = await getCurrentSession();
    const now = new Date();
    const activitySince = new Date(now.getTime() - ACTIVITY_LOOKBACK_MS);

    const eventWhere = authUser.email
      ? { OR: [{ userId: authUser.userId }, { email: authUser.email }] }
      : { userId: authUser.userId };

    const [sessions, loginEvents] = await Promise.all([
      prisma.session.findMany({
        where: {
          userId: authUser.userId,
          expiresAt: { gt: now },
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          expiresAt: true,
          updatedAt: true,
          userAgent: true,
        },
      }),
      prisma.securityEvent.findMany({
        where: {
          ...eventWhere,
          createdAt: { gte: activitySince },
          type: { in: ["LOGIN_SUCCESS", "LOGIN_FAILED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          type: true,
          createdAt: true,
          userAgent: true,
          metadata: true,
        },
      }),
    ]);

    const devices = groupActiveSessionsByDevice(sessions, currentSession?.id);
    const activity = buildUserSecurityActivity(loginEvents, now);

    return apiJson({
      devices: devices.map((device) => ({
        deviceKey: device.deviceKey,
        userAgent: device.userAgent,
        sessionIds: device.sessionIds,
        current: device.current,
        lastSeenAt: device.lastSeenAt.toISOString(),
        expiresAt: device.expiresAt.toISOString(),
      })),
      loginSuccesses: activity.loginSuccesses.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        userAgent: entry.userAgent,
        provider: entry.provider,
      })),
      failedLoginAttempts: activity.failedLoginAttempts.map((entry) => ({
        deviceKey: entry.deviceKey,
        userAgent: entry.userAgent,
        attemptCount: entry.attemptCount,
        lastAttemptAt: entry.lastAttemptAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("Get security settings error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}

export const PATCH = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const currentSession = await getCurrentSession();
    const body = await req.json();
    const parsed = securityActionSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid action");
    }

    if (parsed.data.action === "revokeOthers") {
      await auth.api.revokeOtherSessions({
        headers: await headers(),
      });

      await recordSecurityEvent({
        type: "SESSION_REVOKED",
        userId: authUser.userId,
        email: authUser.email,
        metadata: { reason: "manual_revoke_others" },
      });

      return apiJson({ success: true });
    }

    if (parsed.data.action === "revokeDevice") {
      const userAgent = userAgentFromDeviceKey(parsed.data.deviceKey);
      const sessionsOnDevice = await prisma.session.findMany({
        where: {
          userId: authUser.userId,
          expiresAt: { gt: new Date() },
          userAgent: userAgent ?? null,
        },
        select: { id: true },
      });

      if (sessionsOnDevice.length === 0) {
        return badRequestError("No active sessions found for this device.");
      }

      const revokedCount = await revokeSessionsByIds({
        sessionIds: sessionsOnDevice.map((session) => session.id),
        userId: authUser.userId,
        currentSessionId: currentSession?.id,
      });

      if (revokedCount === 0) {
        return badRequestError("Cannot revoke your current session. Use sign out instead.");
      }

      await recordSecurityEvent({
        type: "SESSION_REVOKED",
        userId: authUser.userId,
        email: authUser.email,
        metadata: {
          reason: "manual_revoke_device",
          deviceKey: parsed.data.deviceKey,
          count: revokedCount,
        },
      });

      return apiJson({ success: true, revokedCount });
    }

    if (currentSession?.id === parsed.data.sessionId) {
      return badRequestError("Use sign out to end your current session.");
    }

    const targetSession = await prisma.session.findFirst({
      where: {
        id: parsed.data.sessionId,
        userId: authUser.userId,
      },
      select: { id: true, token: true },
    });

    if (!targetSession) {
      return badRequestError("Session not found.");
    }

    await auth.api.revokeSession({
      headers: await headers(),
      body: { token: targetSession.token },
    });

    await recordSecurityEvent({
      type: "SESSION_REVOKED",
      userId: authUser.userId,
      email: authUser.email,
      metadata: { reason: "manual_revoke", sessionId: targetSession.id },
    });

    return apiJson({ success: true, revokedCount: 1 });
  } catch (error) {
    logger.error("Update security settings error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
