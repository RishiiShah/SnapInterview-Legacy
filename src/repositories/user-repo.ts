import { prisma } from "@/lib/prisma";

export type NotificationPrefs = {
  emailNotifs: boolean;
  practiceReminders: boolean;
  weeklyReport: boolean;
  scoreAlerts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailNotifs: true,
  practiceReminders: true,
  weeklyReport: true,
  scoreAlerts: false,
};

function coercePrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== "object") return DEFAULT_NOTIFICATION_PREFS;
  const v = value as Record<string, unknown>;
  return {
    emailNotifs: typeof v.emailNotifs === "boolean" ? v.emailNotifs : DEFAULT_NOTIFICATION_PREFS.emailNotifs,
    practiceReminders: typeof v.practiceReminders === "boolean" ? v.practiceReminders : DEFAULT_NOTIFICATION_PREFS.practiceReminders,
    weeklyReport: typeof v.weeklyReport === "boolean" ? v.weeklyReport : DEFAULT_NOTIFICATION_PREFS.weeklyReport,
    scoreAlerts: typeof v.scoreAlerts === "boolean" ? v.scoreAlerts : DEFAULT_NOTIFICATION_PREFS.scoreAlerts,
  };
}

export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPrefs: true },
  });
  return coercePrefs(user?.notificationPrefs);
}

export async function saveUserResume(userId: string, resumeText: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { resumeText },
  });
}

export async function getUserResume(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { resumeText: true },
  });
  return user?.resumeText ?? null;
}

export async function deleteUserResume(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { resumeText: null },
  });
}

export type WeeklyReportRecipient = {
  userId: string;
  email: string;
  name: string;
  sessionsCount: number;
  avgScore: number | null;
  bestRole: string | null;
  bestScore: number | null;
};

export async function findWeeklyReportRecipients(): Promise<WeeklyReportRecipient[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      emailVerified: true,
      interviewSessions: {
        some: { status: "COMPLETED", deletedAt: null, createdAt: { gte: since } },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPrefs: true,
      interviewSessions: {
        where: { status: "COMPLETED", deletedAt: null, createdAt: { gte: since } },
        select: { role: true, evaluation: true },
      },
    },
  });

  const recipients: WeeklyReportRecipient[] = [];
  for (const u of candidates) {
    const prefs = coercePrefs(u.notificationPrefs);
    if (!prefs.emailNotifs || !prefs.weeklyReport) continue;

    const scores: number[] = [];
    let bestRole: string | null = null;
    let bestScore: number | null = null;
    for (const s of u.interviewSessions) {
      const score = (s.evaluation as { score?: unknown } | null)?.score;
      if (typeof score === "number") {
        scores.push(score);
        if (bestScore === null || score > bestScore) {
          bestScore = score;
          bestRole = s.role;
        }
      }
    }
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    recipients.push({
      userId: u.id,
      email: u.email,
      name: u.name.split(" ")[0] || u.name,
      sessionsCount: u.interviewSessions.length,
      avgScore,
      bestRole,
      bestScore,
    });
  }
  return recipients;
}

export type PracticeReminderRecipient = {
  userId: string;
  email: string;
  name: string;
  daysSinceLast: number;
};

export async function findPracticeReminderRecipients(): Promise<PracticeReminderRecipient[]> {
  const now = Date.now();
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      emailVerified: true,
      interviewSessions: {
        some: { status: "COMPLETED", deletedAt: null, createdAt: { gte: fourteenDaysAgo } },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPrefs: true,
      interviewSessions: {
        where: { status: "COMPLETED", deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const recipients: PracticeReminderRecipient[] = [];
  for (const u of candidates) {
    const prefs = coercePrefs(u.notificationPrefs);
    if (!prefs.emailNotifs || !prefs.practiceReminders) continue;

    const lastSession = u.interviewSessions[0];
    if (!lastSession) continue;
    if (lastSession.createdAt > threeDaysAgo) continue;

    const daysSinceLast = Math.floor((now - lastSession.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    recipients.push({
      userId: u.id,
      email: u.email,
      name: u.name.split(" ")[0] || u.name,
      daysSinceLast,
    });
  }
  return recipients;
}
