import { type NextRequest } from "next/server";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, unauthorizedError, badRequestError, internalServerError } from "@/lib/api-response";
import { listCompletedSessionsForUser } from "@/repositories/interview-repo";
import type { InterviewType } from "@/lib/interview/domain";
import { INTERVIEW_TYPE_VALUES } from "@/lib/interview/domain";
import { logger } from "@/utils/logger";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;
const VALID_TYPES = [...INTERVIEW_TYPE_VALUES] as InterviewType[];

export async function GET(request: NextRequest) {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const { searchParams } = request.nextUrl;
    const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10);
    const typeParam = searchParams.get("type");

    if (isNaN(limitParam) || limitParam < 1 || limitParam > MAX_LIMIT) {
        return badRequestError("Invalid limit");
    }
    if (isNaN(offsetParam) || offsetParam < 0) {
        return badRequestError("Invalid offset");
    }

    const interviewType = typeParam && (VALID_TYPES as string[]).includes(typeParam)
        ? (typeParam as InterviewType)
        : undefined;

    try {
        const result = await listCompletedSessionsForUser({
            userId: authUser.userId,
            limit: limitParam,
            offset: offsetParam,
            interviewType,
        });

        return apiJson({
            sessions: result.sessions.map((s) => ({
                ...s,
                createdAt: s.createdAt.toISOString(),
            })),
            hasMore: result.hasMore,
        });
    } catch (error) {
        logger.error("List sessions error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
}
