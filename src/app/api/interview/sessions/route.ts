import { type NextRequest } from "next/server";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiJson, unauthorizedError, badRequestError, internalServerError } from "@/lib/api-response";
import { listCompletedSessionsForUser } from "@/repositories/interview-repo";
import { logger } from "@/utils/logger";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 48;

export async function GET(request: NextRequest) {
    const authUser = await getSessionUserIdentity();
    if (!authUser) return unauthorizedError();

    const { searchParams } = request.nextUrl;
    const limitParam = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
    const offsetParam = parseInt(searchParams.get("offset") ?? "0", 10);

    if (isNaN(limitParam) || limitParam < 1 || limitParam > MAX_LIMIT) {
        return badRequestError("Invalid limit");
    }
    if (isNaN(offsetParam) || offsetParam < 0) {
        return badRequestError("Invalid offset");
    }

    try {
        const result = await listCompletedSessionsForUser({
            userId: authUser.userId,
            limit: limitParam,
            offset: offsetParam,
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
