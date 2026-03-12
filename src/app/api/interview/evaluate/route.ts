import { z } from "zod/v4";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { evaluateInterviewTranscript } from "@/services/evaluation-service";
import { csrfRejectIfInvalid } from "@/lib/csrf";

const evaluateTranscriptSchema = z.object({
    interviewId: z.string().uuid(),
});

export async function POST(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
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

        return apiJson(result.data);
    } catch (error) {
        console.error("Transcript evaluation error:", error);
        return internalServerError();
    }
}
