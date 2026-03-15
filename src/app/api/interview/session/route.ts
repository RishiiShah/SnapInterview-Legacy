import type { InterviewStatus } from "@/generated/prisma/client";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import { z } from "zod/v4";
import {
    ALLOWED_QUESTION_COUNTS,
    ALLOWED_STATUSES,
    getInterviewSessionState,
    startInterviewSession,
    updateSessionStatusIfOwned,
} from "@/services/interview-service";
import { logger } from "@/utils/logger";

const createSessionSchema = z.object({
    role: z.string().trim().min(1, "Role is required").max(200),
    company: z.string().trim().max(200).optional().default(""),
    type: z.string().trim().min(1, "Interview type is required"),
    difficulty: z.string().trim().min(1, "Difficulty is required"),
    persona: z.string().trim().max(50).optional(),
    jobDescription: z.string().trim().max(10000).optional(),
    resumeUrl: z.string().url().optional(),
    questionCount: z.number().int().refine(
        (val) => (ALLOWED_QUESTION_COUNTS as readonly number[]).includes(val),
        "questionCount must be one of: 5, 10, 15"
    ).optional(),
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

        const { role, company, type, difficulty, persona, jobDescription, resumeUrl, questionCount } = parsed.data;

        const interviewSession = await startInterviewSession({
            userId: authUser.userId,
            role,
            company: company || null,
            type,
            difficulty,
            persona,
            jobDescription,
            resumeUrl,
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

        const { interviewId, videoUrl, status } = parsed.data;

        const updated = await updateSessionStatusIfOwned({
            userId: authUser.userId,
            interviewId,
            videoUrl,
            status: status as InterviewStatus | undefined,
        });

        if (updated.type === "not_found") {
            return notFoundError("Interview session not found");
        }

        return apiJson({
            id: updated.data.id,
            videoUrl: updated.data.videoUrl,
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
