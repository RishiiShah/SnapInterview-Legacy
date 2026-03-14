import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recordSecurityEvent } from "@/lib/account-security";
import { apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity, getCurrentSession } from "@/lib/server-auth";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { headers } from "next/headers";

const securityActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke"), sessionId: z.string().min(1) }),
  z.object({ action: z.literal("revokeOthers") }),
]);

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const currentSession = await getCurrentSession();
    const now = new Date();

    const eventWhere = authUser.email
      ? { OR: [{ userId: authUser.userId }, { email: authUser.email }] }
      : { userId: authUser.userId };

    const [sessions, events] = await Promise.all([
      prisma.session.findMany({
        where: {
          userId: authUser.userId,
          expiresAt: { gt: now },
        },
        orderBy: { expiresAt: "desc" },
        select: {
          id: true,
          expiresAt: true,
          updatedAt: true,
          userAgent: true,
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
        expiresAt: session.expiresAt.toISOString(),
        lastSeenAt: session.updatedAt.toISOString(),
        revokedAt: null,
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

export async function PATCH(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

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
      // Use Better Auth's built-in revokeOtherSessions endpoint
      await auth.api.revokeOtherSessions({
        headers: await headers(),
      });

      const revokedCount = await recordSecurityEvent({
        type: "SESSION_REVOKED",
        userId: authUser.userId,
        email: authUser.email,
        metadata: { reason: "manual_revoke_others" },
      });
      void revokedCount;

      return apiJson({ success: true });
    }

    // Revoke a specific session
    if (currentSession?.id === parsed.data.sessionId) {
      return badRequestError("Use sign out to end your current session.");
    }

    // Verify the session belongs to this user
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

    // Use Better Auth's built-in revokeSession endpoint
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
    console.error("Update security settings error:", error);
    return internalServerError();
  }
}