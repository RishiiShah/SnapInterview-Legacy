import type { InterviewStatus } from "@/generated/prisma/client";
import {
    interviewDifficultySchema,
    interviewIdSchema,
    interviewPersonaSchema,
    interviewQuestionCountSchema,
    interviewTypeSchema,
} from "@/lib/interview/domain";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { createRateLimiter } from "@/lib/rate-limit";
import { z } from "zod/v4";
import {
    ALLOWED_STATUSES,
    getInterviewSessionState,
    startInterviewSession,
    updateSessionStatusIfOwned,
} from "@/services/interview-service";
import { deleteInterviewSession } from "@/repositories/interview-repo";
import { withCsrfProtection } from "@/lib/route-security";
import { verifyMultipartCompletionToken } from "@/lib/s3/multipart-upload-token";
import { warmEmbeddingModel } from "@/lib/rag/embeddings";
import { logger } from "@/utils/logger";

const createSessionSchema = z.object({
    id: interviewIdSchema.optional(),
    role: z.string().trim().min(1, "Role is required").max(200),
    company: z.string().trim().max(200).optional().default(""),
    type: interviewTypeSchema,
    difficulty: interviewDifficultySchema,
    persona: interviewPersonaSchema.optional(),
    jobDescription: z.string().trim().max(10000).optional(),
    resumeUrl: z.string().url().optional(),
    resumeText: z.string().trim().max(8000).optional(),
    questionCount: interviewQuestionCountSchema.optional(),
});
const createSessionLimiter = createRateLimiter("interview-session-create", 60 * 60 * 1000, 30);
const deleteSessionLimiter = createRateLimiter("interview-session-delete", 60 * 60 * 1000, 60);

export async function GET(req: Request) {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const { searchParams } = new URL(req.url);
        const rawInterviewId = searchParams.get("interviewId");

        if (!rawInterviewId) {
            return badRequestError("interviewId is required");
        }

        const parsedId = interviewIdSchema.safeParse(rawInterviewId);
        if (!parsedId.success) {
            return badRequestError("interviewId must be a valid UUID");
        }
        const interviewId = parsedId.data;

        const interviewSession = await getInterviewSessionState({
            interviewId,
            userId: authUser.userId,
        });

        if (!interviewSession) {
            return notFoundError("Interview session not found");
        }

        return apiJson(interviewSession);
    } catch (error) {
        logger.error("Get interview session error", {
            error: error instanceof Error ? error.message : String(error),
            route: "GET /api/interview/session",
        });
        return internalServerError();
    }
}

export const POST = withCsrfProtection(async (req: Request) => {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        if (await createSessionLimiter.isLimited(authUser.userId)) {
            return apiError("Too many interview sessions created. Please try again later.", 429);
        }

        const body = await req.json();
        const parsed = createSessionSchema.safeParse(body);

        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || "Invalid input";
            return badRequestError(firstError);
        }

        const { id, role, company, type, difficulty, persona, jobDescription, resumeUrl, resumeText, questionCount } = parsed.data;

        const interviewSession = await startInterviewSession({
            id,
            userId: authUser.userId,
            role,
            company: company || null,
            type,
            difficulty,
            persona,
            jobDescription,
            resumeUrl,
            resumeText,
            questionCount,
        });
        warmEmbeddingModel();

        return apiJson({ id: interviewSession.id }, 201);
    } catch (error) {
        logger.error("Create interview session error", {
            error: error instanceof Error ? error.message : String(error),
            route: "POST /api/interview/session",
        });
        return internalServerError();
    }
});

const patchSessionSchema = z.object({
    interviewId: interviewIdSchema,
    videoKey: z.string().trim().min(1).nullable().optional(),
    videoCompletionToken: z.string().min(1).optional(),
    status: z.string().refine(
        (val) => (ALLOWED_STATUSES as readonly string[]).includes(val),
        "Invalid status value"
    ).optional(),
});

export const PATCH = withCsrfProtection(async (req: Request) => {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const body = await req.json();
        if (body && typeof body === "object" && "videoUrl" in body) {
            return badRequestError("videoUrl cannot be updated directly");
        }

        const parsed = patchSessionSchema.safeParse(body);

        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || "Invalid input";
            return badRequestError(firstError);
        }

        const { interviewId, videoKey, videoCompletionToken, status } = parsed.data;
        let verifiedVideoKey = videoKey;

        if (typeof videoKey === "string") {
            const expectedKey = `${authUser.userId}/interview-${interviewId}.webm`;
            if (
                videoKey !== expectedKey ||
                !videoCompletionToken ||
                !verifyMultipartCompletionToken(videoCompletionToken, {
                    userId: authUser.userId,
                    interviewId,
                    key: expectedKey,
                })
            ) {
                return apiError("Unauthorized to attach video recording", 403);
            }

            verifiedVideoKey = expectedKey;
        }

        const updated = await updateSessionStatusIfOwned({
            userId: authUser.userId,
            interviewId,
            videoUrl: undefined,
            videoKey: verifiedVideoKey,
            status: status as InterviewStatus | undefined,
        });

        if (updated.type === "not_found") {
            return notFoundError("Interview session not found");
        }

        if (updated.type === "conflict") {
            return apiJson({ error: updated.message }, 409);
        }

        return apiJson({
            id: updated.data.id,
            videoUrl: updated.data.videoUrl,
            videoKey: updated.data.videoKey,
            status: updated.data.status,
        });
    } catch (error) {
        logger.error("Update interview session error", {
            error: error instanceof Error ? error.message : String(error),
            route: "PATCH /api/interview/session",
        });
        return internalServerError();
    }
});

export const DELETE = withCsrfProtection(async (req: Request) => {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        if (await deleteSessionLimiter.isLimited(authUser.userId)) {
            return apiError("Too many interview session delete requests. Please try again later.", 429);
        }

        const { searchParams } = new URL(req.url);
        const rawInterviewId = searchParams.get("interviewId");

        if (!rawInterviewId) {
            return badRequestError("interviewId is required");
        }

        const parsedId = interviewIdSchema.safeParse(rawInterviewId);
        if (!parsedId.success) {
            return badRequestError("interviewId must be a valid UUID");
        }
        const interviewId = parsedId.data;

        await deleteInterviewSession({
            interviewId,
            userId: authUser.userId,
        });

        return apiJson({ success: true });
    } catch (error) {
        logger.error("Delete interview session error", {
            error: error instanceof Error ? error.message : String(error),
            route: "DELETE /api/interview/session",
        });
        return internalServerError();
    }
});
