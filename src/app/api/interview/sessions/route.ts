import { type NextRequest } from "next/server";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, unauthorizedError, badRequestError, internalServerError } from "@/lib/api-response";
import { listCompletedSessionsForUser } from "@/repositories/interview-repo";
import type { InterviewType } from "@/lib/interview/domain";
import { INTERVIEW_TYPE_VALUES, interviewIdSchema } from "@/lib/interview/domain";
import { logger } from "@/utils/logger";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;
const VALID_TYPES = [...INTERVIEW_TYPE_VALUES] as InterviewType[];

function parseCursor(createdAtParam: string | null, idParam: string | null) {
    if (createdAtParam === null && idParam === null) return { cursor: undefined };
    if (createdAtParam === null || idParam === null) return null;

    const id = interviewIdSchema.safeParse(idParam);
    const createdAt = new Date(createdAtParam);
    if (!id.success || Number.isNaN(createdAt.getTime())) return null;

    return { cursor: { createdAt, id: id.data } };
}

export async function GET(request: NextRequest) {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const { searchParams } = request.nextUrl;
    const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10);
    const typeParam = searchParams.get("type");
    const cursorParam = parseCursor(
        searchParams.get("cursorCreatedAt"),
        searchParams.get("cursorId"),
    );

    if (isNaN(limitParam) || limitParam < 1 || limitParam > MAX_LIMIT) {
        return badRequestError("Invalid limit");
    }
    if (isNaN(offsetParam) || offsetParam < 0) {
        return badRequestError("Invalid offset");
    }
    if (!cursorParam) {
        return badRequestError("Invalid cursor");
    }

    const interviewType = typeParam && (VALID_TYPES as string[]).includes(typeParam)
        ? (typeParam as InterviewType)
        : undefined;

    try {
        const result = await listCompletedSessionsForUser({
            userId: authUser.userId,
            limit: limitParam,
            offset: offsetParam,
            cursor: cursorParam.cursor,
            interviewType,
        });

        return apiJson({
            sessions: result.sessions.map((s) => ({
                ...s,
                createdAt: s.createdAt.toISOString(),
            })),
            hasMore: result.hasMore,
            nextCursor: result.nextCursor
                ? {
                    createdAt: result.nextCursor.createdAt.toISOString(),
                    id: result.nextCursor.id,
                }
                : null,
        });
    } catch (error) {
        logger.error("List sessions error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return internalServerError();
    }
}
