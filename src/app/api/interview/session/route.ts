import type { InterviewStatus } from "@/generated/prisma/client";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, badRequestError, internalServerError, notFoundError, unauthorizedError } from "@/lib/api-response";
import {
    ALLOWED_QUESTION_COUNTS,
    ALLOWED_STATUSES,
    getInterviewSessionState,
    startInterviewSession,
    updateSessionStatusIfOwned,
} from "@/services/interview-service";

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
        console.error("Get interview session error:", error);
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
        const { role, company, type, difficulty, persona, jobDescription, resumeUrl, questionCount } = body;

        if (!role || !type || !difficulty) {
            return badRequestError("role, type, and difficulty are required");
        }

        if (
            questionCount !== undefined &&
            !ALLOWED_QUESTION_COUNTS.includes(questionCount)
        ) {
            return badRequestError("questionCount must be one of: 5, 10, 15");
        }

        const interviewSession = await startInterviewSession({
            userId: authUser.userId,
            role,
            company,
            type,
            difficulty,
            persona,
            jobDescription,
            resumeUrl,
            questionCount,
        });

        return apiJson({ id: interviewSession.id }, 201);
    } catch (error) {
        console.error("Create interview session error:", error);
        return internalServerError();
    }
}

export async function PATCH(req: Request) {
    try {
        const csrfError = csrfCheck(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const body = await req.json();
        const { interviewId, videoUrl, status } = body as {
            interviewId?: string;
            videoUrl?: string | null;
            status?: InterviewStatus;
        };

        if (!interviewId || typeof interviewId !== "string") {
            return badRequestError("interviewId is required");
        }

        // Validate status if provided
        if (status && !(ALLOWED_STATUSES as readonly string[]).includes(status)) {
            return badRequestError("Invalid status value");
        }

        const updated = await updateSessionStatusIfOwned({
            userId: authUser.userId,
            interviewId,
            videoUrl,
            status,
        });

        if (updated.type === "not_found") {
            return notFoundError("Interview session not found");
        }

        return apiJson({ id: updated.data.id, videoUrl: updated.data.videoUrl });
    } catch (error) {
        console.error("Update interview session error:", error);
        return internalServerError();
    }
}
