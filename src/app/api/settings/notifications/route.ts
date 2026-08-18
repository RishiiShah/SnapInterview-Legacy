import { prisma } from "@/lib/prisma";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { normalizeNotificationPrefs, notificationPrefsInputSchema } from "@/lib/notifications/preferences";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { parseJsonBody } from "@/lib/http/request-body";
import { logger } from "@/utils/logger";

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: { notificationPrefs: true },
    });

    if (!user) {
      return notFoundError("User not found");
    }

    return apiJson({
      notificationPrefs: normalizeNotificationPrefs(user.notificationPrefs),
    });
  } catch (error) {
    logger.error("Get notification preferences error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}

export const PUT = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const parsed = await parseJsonBody(req, notificationPrefsInputSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const updated = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        notificationPrefs: parsed.data,
      },
      select: { notificationPrefs: true },
    }).catch((error) => {
      if (error instanceof Error && "code" in error && error.code === "P2025") {
        return null;
      }
      throw error;
    });

    if (!updated) {
      return notFoundError("User not found");
    }

    return apiJson({
      notificationPrefs: normalizeNotificationPrefs(updated.notificationPrefs),
    });
  } catch (error) {
    logger.error("Update notification preferences error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
