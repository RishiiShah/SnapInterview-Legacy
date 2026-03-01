import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { z } from "zod/v4";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { notificationPrefs: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      notificationPrefs: normalizePrefs(user.notificationPrefs),
    });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

    const email = await getAuthedEmail();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = prefsSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid notification preferences";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { email },
      data: {
        notificationPrefs: parsed.data,
      },
      select: { notificationPrefs: true },
    });

    return NextResponse.json({
      notificationPrefs: normalizePrefs(updated.notificationPrefs),
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
