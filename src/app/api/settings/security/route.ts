import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionRecord } from "@/lib/auth-session";
import { recordSecurityEvent, revokeUserSessions } from "@/lib/account-security";
import { extractRequestContext } from "@/lib/security";
import { apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";

const securityActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke"), sessionId: z.string().min(1) }),
  z.object({ action: z.literal("revokeOthers") }),
]);

export async function GET(req: Request) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const currentSession = await getCurrentSessionRecord(req);
    const now = new Date();

    const eventWhere = authUser.email
      ? { OR: [{ userId: authUser.userId }, { email: authUser.email }] }
      : { userId: authUser.userId };

    const [sessions, events] = await Promise.all([
      prisma.session.findMany({
        where: {
          userId: authUser.userId,
          expires: { gt: now },
        },
        orderBy: [{ lastSeenAt: "desc" }, { expires: "desc" }],
        select: {
          id: true,
          expires: true,
          userAgent: true,
          lastSeenAt: true,
          revokedAt: true,
        },
      }),
      prisma.securityEvent.findMany({
        where: eventWhere,
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          type: true,
          createdAt: true,
          userAgent: true,
          metadata: true,
        },
      }),
    ]);

    return apiJson({
      sessions: sessions.map((session) => ({
        id: session.id,
        current: currentSession?.id === session.id,
        expiresAt: session.expires.toISOString(),
        lastSeenAt: session.lastSeenAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString() ?? null,
        userAgent: session.userAgent,
      })),
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.createdAt.toISOString(),
        userAgent: event.userAgent,
        metadata: event.metadata,
      })),
    });
  } catch (error) {
    console.error("Get security settings error:", error);
    return internalServerError();
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const currentSession = await getCurrentSessionRecord(req);
    if (!currentSession) {
      return apiJson({ success: true });
    }

    const { ipHash, userAgent } = extractRequestContext(req.headers);

    await prisma.session.update({
      where: { id: currentSession.id },
      data: {
        lastSeenAt: new Date(),
        userAgent: userAgent ?? undefined,
        ipHash: ipHash ?? undefined,
      },
    });

    return apiJson({ success: true });
  } catch (error) {
    console.error("Touch current session error:", error);
    return internalServerError();
  }
}

export async function PATCH(req: Request) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const currentSession = await getCurrentSessionRecord(req);
    const body = await req.json();
    const parsed = securityActionSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestError(parsed.error.issues[0]?.message || "Invalid action");
    }

    if (parsed.data.action === "revokeOthers") {
      const revokedCount = await revokeUserSessions({
        userId: authUser.userId,
        excludeSessionToken: currentSession?.sessionToken,
        reason: "manual_revoke",
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
      select: {
        id: true,
      },
    });

    if (!targetSession) {
      return badRequestError("Session not found.");
    }

    const now = new Date();
    await prisma.session.update({
      where: { id: targetSession.id },
      data: {
        revokedAt: now,
        expires: now,
      },
    });

    await recordSecurityEvent({
      type: "SESSION_REVOKED",
      userId: authUser.userId,
      email: authUser.email,
      metadata: { reason: "manual_revoke", sessionId: targetSession.id },
    });

    return apiJson({ success: true, revokedCount: 1 });
  } catch (error) {
    console.error("Update security settings error:", error);
    return internalServerError();
  }
}