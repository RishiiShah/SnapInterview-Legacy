import { prisma } from "@/lib/prisma";

type DailyCountRow = { day: Date; count: bigint };

function toDayKey(day: Date) {
  return day.toISOString().slice(0, 10);
}

export async function getAdminDailySignupCounts(since: Date): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<DailyCountRow[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "User"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;

  return new Map(rows.map((row) => [toDayKey(row.day), Number(row.count)]));
}

export async function getAdminDailyInterviewCounts(since: Date): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<DailyCountRow[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "InterviewSession"
    WHERE "deletedAt" IS NULL AND "createdAt" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;

  return new Map(rows.map((row) => [toDayKey(row.day), Number(row.count)]));
}
