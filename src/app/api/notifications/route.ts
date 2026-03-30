import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, internalServerError, unauthorizedError } from "@/lib/api-response";
import { getUserNotifications, markAllNotificationsRead } from "@/repositories/notification-repo";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

export async function GET() {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    const notifications = await getUserNotifications(authUser.userId);
    return apiJson({ notifications });
  } catch (error) {
    logger.error("Get notifications error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}

export const PATCH = withCsrfProtection(async (req: Request) => {
  try {
    void req;

    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    await markAllNotificationsRead(authUser.userId);
    return apiJson({ ok: true });
  } catch (error) {
    logger.error("Mark notifications read error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
