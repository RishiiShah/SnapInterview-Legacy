import { z } from "zod/v4";
import { apiJson, badGatewayError, badRequestError, internalServerError, notFoundError, tooManyRequestsError, unauthorizedError } from "@/lib/api-response";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { evaluatePracticeQuestion } from "@/services/evaluation-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { parseJsonBody } from "@/lib/http/request-body";
import { logger } from "@/utils/logger";

const evaluateSchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.string().trim().max(6000),
});

const questionEvaluateLimiter = createRateLimiter("questions-evaluate", 10 * 60 * 1000, 30);

export const POST = withCsrfProtection(async (req: Request) => {
  try {
    const authUser = await getSessionUserIdentity();
    if (!authUser) {
      return unauthorizedError();
    }

    if (await questionEvaluateLimiter.isLimited(authUser.userId)) {
      return tooManyRequestsError("Too many evaluation requests. Please try again later.");
    }

    const parsed = await parseJsonBody(req, evaluateSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const { questionId, answer } = parsed.data;

    const result = await evaluatePracticeQuestion({ questionId, answer });
    if (result.type === "not_found") {
      return notFoundError("Question not found");
    }

    if (result.type === "upstream_error") {
      return badGatewayError(result.message);
    }

    return apiJson(result.data);
  } catch (error) {
    logger.error("Question evaluation error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalServerError();
  }
});
