import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { normalizeTranscriptEvaluation } from "@/lib/interview/evaluation";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { logger } from "@/utils/logger";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getQuestionFeedbackForSession } from "@/repositories/interview-repo";
import { hardDeleteInterviewSessionForUser } from "@/lib/interview/hard-delete-session";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";

const interviewIdSchema = z.string().min(1);

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const csrfError = await csrfRejectIfInvalid(request);
    if (csrfError) return csrfError;

    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const { id } = await params;
    const parsedId = interviewIdSchema.safeParse(id);
    if (!parsedId.success) return badRequestError("Invalid interview ID");

    try {
        const deleted = await hardDeleteInterviewSessionForUser({
            id: parsedId.data,
            userId: authUser.userId,
        });
        if (!deleted) return notFoundError("Interview session not found");

        invalidateInterviewMetricsCache(authUser.userId);
        return apiJson({ success: true });
    } catch (error) {
        logger.error("Delete interview session error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const { id } = await params;
        const parsedId = interviewIdSchema.safeParse(id);
        if (!parsedId.success) {
            return badRequestError("Invalid interview ID");
        }

        const [interviewSession, feedback] = await Promise.all([
            prisma.interviewSession.findFirst({
                where: {
                    id: parsedId.data,
                    userId: authUser.userId,
                },
                select: {
                    id: true,
                    role: true,
                    type: true,
                    difficulty: true,
                    evaluation: true,
                    createdAt: true,
                    transcript: {
                        select: {
                            id: true,
                            question: true,
                            answer: true,
                            order: true,
                            createdAt: true,
                        },
                        orderBy: { order: "asc" },
                    },
                },
            }),
            getQuestionFeedbackForSession(parsedId.data),
        ]);

        if (!interviewSession) {
            return notFoundError("Interview session not found");
        }

        return apiJson({
            ...interviewSession,
            evaluation: normalizeTranscriptEvaluation(interviewSession.evaluation),
            feedback,
        });
    } catch (error) {
        logger.error("Get interview session error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
}
