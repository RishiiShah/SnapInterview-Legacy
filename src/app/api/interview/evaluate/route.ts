import { z } from "zod/v4";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badGatewayError, badRequestError, conflictError, internalServerError, notFoundError, tooManyRequestsError, unauthorizedError } from "@/lib/api-response";
import { evaluateInterviewTranscript } from "@/services/evaluation-service";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { sendEvaluationEmail } from "@/lib/email";
import { getNotificationPrefs } from "@/repositories/user-repo";
import { interviewIdSchema } from "@/lib/interview/domain";
import { parseJsonBody } from "@/lib/http/request-body";
import { logger } from "@/utils/logger";

const evaluateTranscriptSchema = z.object({
    interviewId: interviewIdSchema,
});

const interviewEvaluateLimiter = createRateLimiter("interview-evaluate", 10 * 60 * 1000, 5);

export const POST = withCsrfProtection(async (req: Request) => {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        if (await interviewEvaluateLimiter.isLimited(authUser.userId)) {
            return tooManyRequestsError("Too many evaluation requests. Please try again later.");
        }

        const parsed = await parseJsonBody(req, evaluateTranscriptSchema);
        if (!parsed.ok) {
            return parsed.response;
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

        if (result.type === "in_progress") {
            return conflictError("Evaluation is already in progress. Please retry shortly.");
        }

        if (result.type === "invalid_session") {
            return badRequestError(result.message);
        }

        if (result.type === "upstream_error") {
            return badGatewayError(result.message);
        }

        if (result.fresh && authUser.email) {
            void (async () => {
                try {
                    const prefs = await getNotificationPrefs(authUser.userId);
                    if (!prefs.emailNotifs) return;
                    await sendEvaluationEmail({
                        to: authUser.email!,
                        role: result.role,
                        score: result.data.score,
                        feedback: result.data.feedback,
                        strengths: result.data.strengths,
                        improvements: result.data.areasForImprovement,
                    });
                } catch (err) {
                    logger.error("Failed to send evaluation email", {
                        error: err instanceof Error ? err.message : String(err),
                    });
                }
            })();
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
