import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

const searchLimiter = createRateLimiter("search", 60 * 1000, 30);

export type SearchSession = {
  id: string;
  role: string;
  company: string | null;
  type: string;
  difficulty: string;
  createdAt: string;
};

export type SearchQuestion = {
  id: string;
  slug: string;
  text: string;
  category: string | null;
  difficulty: string;
  type: string;
};

export type SearchResults = {
  sessions: SearchSession[];
  questions: SearchQuestion[];
};

export async function GET(req: Request) {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    if (await searchLimiter.isLimited(authUser.userId)) {
      return badRequestError("Too many search requests. Please slow down.");
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 2) {
      return badRequestError("Query must be at least 2 characters");
    }

    if (q.length > 100) {
      return badRequestError("Query too long");
    }

    const [sessions, practiceQuestions, codingQuestions] = await Promise.all([
      prisma.interviewSession.findMany({
        where: {
          userId: authUser.userId,
          deletedAt: null,
          status: "COMPLETED",
          OR: [
            { role: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { type: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, role: true, company: true, type: true, difficulty: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.practiceQuestion.findMany({
        where: {
          OR: [
            { text: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
          ],
        },
        select: { id: true, slug: true, text: true, category: true, difficulty: true },
        take: 5,
      }),
      prisma.codingQuestion.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { topics: { has: q.toLowerCase() } },
          ],
        },
        select: { id: true, slug: true, title: true, difficulty: true },
        take: 5,
      }),
    ]);

    const result: SearchResults = {
      sessions: sessions.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
      questions: [
        ...practiceQuestions.map((question) => ({
          id: String(question.id),
          slug: question.slug,
          text: question.text,
          category: question.category,
          difficulty: question.difficulty,
          type: "question",
        })),
        ...codingQuestions.map((question) => ({
          id: question.id,
          slug: question.slug,
          text: question.title,
          category: null,
          difficulty: question.difficulty,
          type: "coding",
        })),
      ],
    };

    return apiJson(result);
  } catch (error) {
    logger.error("Search error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}
