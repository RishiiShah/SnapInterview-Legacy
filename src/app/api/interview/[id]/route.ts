import { prisma } from "@/lib/prisma";
import { normalizeTranscriptEvaluation } from "@/lib/interview/evaluation";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { logger } from "@/utils/logger";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { softDeleteInterviewSession } from "@/repositories/interview-repo";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import { interviewIdSchema } from "@/lib/interview/domain";
import { buildVoiceAnalysis } from "@/lib/interview/voice-analysis";

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
        const deleted = await softDeleteInterviewSession({
            interviewId: parsedId.data,
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

        const interviewSession = await prisma.interviewSession.findFirst({
            where: {
                id: parsedId.data,
                userId: authUser.userId,
                deletedAt: null,
            },
            select: {
                id: true,
                role: true,
                company: true,
                type: true,
                difficulty: true,
                level: true,
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
                questionFeedback: {
                    select: {
                        questionOrder: true,
                        rating: true,
                    },
                    orderBy: { questionOrder: "asc" },
                },
                voiceAnalysis: {
                    select: {
                        turns: {
                            select: {
                                transcriptOrder: true,
                                responseLatencyMs: true,
                                speakingDurationMs: true,
                                wordsPerMinute: true,
                                pauseRatio: true,
                                energyVariation: true,
                                fillerWordCount: true,
                                audioQualityScore: true,
                                confidenceScore: true,
                            },
                            orderBy: { transcriptOrder: "asc" },
                        },
                    },
                },
                replayTurns: {
                    select: {
                        transcriptOrder: true,
                        questionStartMs: true,
                        questionEndMs: true,
                        answerStartMs: true,
                        answerEndMs: true,
                        timingSource: true,
                        confidenceScore: true,
                    },
                    orderBy: { transcriptOrder: "asc" },
                },
            },
        });

        if (!interviewSession) {
            return notFoundError("Interview session not found");
        }

        const { questionFeedback: feedback, voiceAnalysis, ...session } = interviewSession;

        return apiJson({
            ...session,
            evaluation: normalizeTranscriptEvaluation(interviewSession.evaluation),
            voiceAnalysis: voiceAnalysis ? buildVoiceAnalysis(voiceAnalysis.turns) : null,
            feedback,
        });
    } catch (error) {
        logger.error("Get interview session error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
}
