import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { getServerAuthSession } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

const toggleSolvedSchema = z.object({
  questionId: z.number().int().positive(),
  solved: z.boolean(),
});

async function getAuthedUserId() {
  const session = await getServerAuthSession();
  const sessionUserId = session?.user?.id ?? session?.session?.userId;
  if (sessionUserId) {
    return sessionUserId;
  }

  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return unauthorizedError();
    }

    const solved = await prisma.solvedQuestion.findMany({
      where: { userId },
      select: { questionId: true },
      orderBy: { solvedAt: "desc" },
    });

    return apiJson({ solvedQuestionIds: solved.map((item) => item.questionId) });
  } catch (error) {
    logger.error("Get solved questions error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return unauthorizedError();
    }

    const body = await req.json();
    const parsed = toggleSolvedSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid payload";
      return badRequestError(message);
    }

    const { questionId, solved } = parsed.data;

    if (solved) {
      await prisma.solvedQuestion.upsert({
        where: { userId_questionId: { userId, questionId } },
        update: {},
        create: { userId, questionId },
      });
    } else {
      await prisma.solvedQuestion.deleteMany({
        where: { userId, questionId },
      });
    }

    return apiJson({ solved, questionId });
  } catch (error) {
    logger.error("Toggle solved question error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
