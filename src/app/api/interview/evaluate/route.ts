import { z } from "zod/v4";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { evaluateInterviewTranscript } from "@/services/evaluation-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

const evaluateTranscriptSchema = z.object({
    interviewId: z.string().uuid(),
});

const interviewEvaluateLimiter = createRateLimiter("interview-evaluate", 10 * 60 * 1000, 5);

export const POST = withCsrfProtection(async (req: Request) => {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        if (await interviewEvaluateLimiter.isLimited(authUser.userId)) {
            return badRequestError("Too many evaluation requests. Please try again later.");
        }

        const body = await req.json();
        const parsed = evaluateTranscriptSchema.safeParse(body);

        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || "Invalid request body";
            return badRequestError(firstError);
        }

        const { interviewId } = parsed.data;

        const result = await evaluateInterviewTranscript({
            userId: authUser.userId,
            interviewId,
        });

        if (result.type === "not_found") {
            return notFoundError("Interview session not found");
        }

        if (result.type === "no_transcript") {
            return badRequestError("No transcript found for this interview");
        }

        if (result.type === "error") {
            return badRequestError(result.message);
        }

        return apiJson(result.data);
    } catch (error) {
        logger.error("Transcript evaluation API error", {
            error: error instanceof Error ? error.message : String(error),
            route: "POST /api/interview/evaluate",
        });
        return internalServerError();
    }
});
