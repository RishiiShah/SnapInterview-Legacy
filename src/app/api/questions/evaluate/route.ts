import { z } from "zod/v4";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { evaluatePracticeQuestion } from "@/services/evaluation-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { logger } from "@/utils/logger";

const evaluateSchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.string().trim().max(6000),
});

const questionEvaluateLimiter = createRateLimiter("questions-evaluate", 10 * 60 * 1000, 30);

export async function POST(req: Request) {
  try {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) return csrfError;

    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    if (await questionEvaluateLimiter.isLimited(authUser.userId)) {
      return badRequestError("Too many evaluation requests. Please try again later.");
    }

    const body = await req.json();
    const parsed = evaluateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid request body";
      return badRequestError(firstError);
    }

    const { questionId, answer } = parsed.data;

    const result = await evaluatePracticeQuestion({ questionId, answer });
    if (result.type === "not_found") {
      return notFoundError("Question not found");
    }

    return apiJson(result.data);
  } catch (error) {
    logger.error("Question evaluation error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
}
