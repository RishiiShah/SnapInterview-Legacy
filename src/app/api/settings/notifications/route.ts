import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { getServerAuthSession } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

const prefsSchema = z.object({
  emailNotifs: z.boolean(),
  practiceReminders: z.boolean(),
  weeklyReport: z.boolean(),
  scoreAlerts: z.boolean(),
});

type NotificationPrefs = z.infer<typeof prefsSchema>;

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailNotifs: true,
  practiceReminders: true,
  weeklyReport: true,
  scoreAlerts: false,
};

function normalizePrefs(value: unknown): NotificationPrefs {
  const parsed = prefsSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return DEFAULT_NOTIFICATION_PREFS;
}

async function getAuthedEmail() {
  const session = await getServerAuthSession();
  return session?.user?.email?.toLowerCase() ?? null;
}

export async function GET() {
  try {
    const email = await getAuthedEmail();
    if (!email) {
      return unauthorizedError();
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { notificationPrefs: true },
    });

    if (!user) {
      return notFoundError("User not found");
    }

    return apiJson({
      notificationPrefs: normalizePrefs(user.notificationPrefs),
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
    const email = await getAuthedEmail();
    if (!email) {
      return unauthorizedError();
    }

    const body = await req.json();
    const parsed = prefsSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid notification preferences";
      return badRequestError(message);
    }

    const updated = await prisma.user.update({
      where: { email },
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
      notificationPrefs: normalizePrefs(updated.notificationPrefs),
    });
  } catch (error) {
    logger.error("Update notification preferences error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
