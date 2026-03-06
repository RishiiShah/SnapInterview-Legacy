import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { z } from "zod/v4";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";

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
  const session = await getServerSession();
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
    console.error("Get notification preferences error:", error);
    return internalServerError();
  }
}

export async function PUT(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

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
    });

    return apiJson({
      notificationPrefs: normalizePrefs(updated.notificationPrefs),
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return internalServerError();
  }
}
