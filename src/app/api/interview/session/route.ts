import type { InterviewStatus } from "@/generated/prisma/client";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import {
    interviewDifficultySchema,
    interviewPersonaSchema,
    interviewQuestionCountSchema,
    interviewTypeSchema,
} from "@/lib/interview/domain";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { z } from "zod/v4";
import {
    ALLOWED_STATUSES,
    getInterviewSessionState,
    startInterviewSession,
    updateSessionStatusIfOwned,
} from "@/services/interview-service";
import { deleteInterviewSession } from "@/repositories/interview-repo";
import { logger } from "@/utils/logger";

const createSessionSchema = z.object({
    id: z.string().uuid().optional(),
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

function csrfCheck(req: Request) {
    return csrfRejectIfInvalid(req);
}

export async function GET(req: Request) {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const { searchParams } = new URL(req.url);
        const interviewId = searchParams.get("interviewId");

        if (!interviewId) {
            return badRequestError("interviewId is required");
        }

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

export async function POST(req: Request) {
    try {
        const csrfError = csrfCheck(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
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

        return apiJson({ id: interviewSession.id }, 201);
    } catch (error) {
        logger.error("Create interview session error", {
            error: error instanceof Error ? error.message : String(error),
            route: "POST /api/interview/session",
        });
        return internalServerError();
    }
}

const patchSessionSchema = z.object({
    interviewId: z.string().uuid("interviewId must be a valid UUID"),
    videoUrl: z.string().url().nullable().optional(),
    videoKey: z.string().trim().min(1).nullable().optional(),
    status: z.string().refine(
        (val) => (ALLOWED_STATUSES as readonly string[]).includes(val),
        "Invalid status value"
    ).optional(),
});

export async function PATCH(req: Request) {
    try {
        const csrfError = csrfCheck(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const body = await req.json();
        const parsed = patchSessionSchema.safeParse(body);

        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || "Invalid input";
            return badRequestError(firstError);
        }

        const { interviewId, videoUrl, videoKey, status } = parsed.data;

        const updated = await updateSessionStatusIfOwned({
            userId: authUser.userId,
            interviewId,
            videoUrl,
            videoKey,
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
}

export async function DELETE(req: Request) {
    try {
        const csrfError = csrfCheck(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const { searchParams } = new URL(req.url);
        const interviewId = searchParams.get("interviewId");

        if (!interviewId) {
            return badRequestError("interviewId is required");
        }

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
}
