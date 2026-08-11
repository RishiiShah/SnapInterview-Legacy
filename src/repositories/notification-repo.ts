import { prisma } from "@/lib/prisma";

export interface GeneratedNotification {
  id: string;
  title: string;
  message: string;
  triggeredAt: Date;
  read: boolean;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export async function getUserNotifications(userId: string): Promise<(GeneratedNotification & { time: string })[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [user, completedSessions, allCompletedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsLastReadAt: true },
    }),
    prisma.interviewSession.findMany({
      where: { userId, status: "COMPLETED", deletedAt: null, createdAt: { gte: since } },
      select: { id: true, role: true, company: true, evaluation: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.interviewSession.count({
      where: { userId, status: "COMPLETED", deletedAt: null },
    }),
  ]);

  const lastReadAt = user?.notificationsLastReadAt ?? null;

  const pending: Omit<GeneratedNotification, "read">[] = [];

  // 1. Most recent completed session (last 7 days)
  const latest = completedSessions[0];
  if (latest) {
    const daysSince = Math.floor((Date.now() - latest.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) {
      const where = latest.company ? `at ${latest.company}` : "interview";
      pending.push({
        id: `session_${latest.id}`,
        title: "Interview completed",
        message: `Your ${latest.role} ${where} is ready to review.`,
        triggeredAt: latest.createdAt,
      });
    }
  }

  // 2. High score streak on last 3 sessions
  const withScores = completedSessions.filter(
    (s) => s.evaluation && typeof s.evaluation === "object" && "score" in (s.evaluation as object)
  );
  if (withScores.length >= 3) {
    const top3 = withScores.slice(0, 3);
    const avg = top3.reduce((sum, s) => sum + (s.evaluation as { score: number }).score, 0) / 3;
    if (avg >= 85) {
      pending.push({
        id: "score_streak_85",
        title: "On a roll! 🎯",
        message: `You're averaging ${Math.round(avg)}+ on your last 3 interviews. Excellent work.`,
        triggeredAt: top3[0].createdAt,
      });
    }
  }

  // 3. Session count milestone (highest reached)
  if (allCompletedCount >= 1) {
    const milestones = [50, 25, 10, 5, 1];
    for (const milestone of milestones) {
      if (allCompletedCount >= milestone) {
        const milestoneSession = await prisma.interviewSession.findFirst({
          where: { userId, status: "COMPLETED", deletedAt: null },
          orderBy: { createdAt: "asc" },
          skip: milestone - 1,
          select: { createdAt: true },
        });
        if (milestoneSession) {
          const title = milestone === 1
            ? "First interview done! 🎉"
            : `${milestone} interviews completed! 🏆`;
          const message = milestone === 1
            ? "You completed your first mock interview. The first step is always the hardest."
            : `You've completed ${milestone} mock interviews. Consistency is the key to confidence.`;
          pending.push({ id: `milestone_${milestone}`, title, message, triggeredAt: milestoneSession.createdAt });
        }
        break;
      }
    }
  }

  // 4. Practice streak (consecutive days with a session)
  const sessionDays = new Set(
    completedSessions.map((s) => s.createdAt.toISOString().slice(0, 10))
  );
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (sessionDays.has(d.toISOString().slice(0, 10))) {
      streak++;
    } else {
      break;
    }
  }
  if (streak >= 2) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    pending.push({
      id: `streak_${streak}`,
      title: `${streak}-day streak! 🔥`,
      message: `You've practiced ${streak} days in a row. Stay consistent to build lasting confidence.`,
      triggeredAt: todayStart,
    });
  }

  return pending
    .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
    .slice(0, 8)
    .map((n) => ({
      ...n,
      time: timeAgo(n.triggeredAt),
      read: lastReadAt !== null && n.triggeredAt <= lastReadAt,
    }));
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { notificationsLastReadAt: new Date() },
  });
}
