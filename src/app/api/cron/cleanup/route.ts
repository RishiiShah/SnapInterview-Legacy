import { type NextRequest, NextResponse } from "next/server";
import { hardDeleteSoftDeletedSessions } from "@/repositories/interview-repo";
import { env } from "@/lib/env";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        const deleted = await hardDeleteSoftDeletedSessions(thirtyDaysAgo);
        logger.info("Cron cleanup: hard-deleted soft-deleted sessions", { deleted });
        return NextResponse.json({ deleted });
    } catch (error) {
        logger.error("Cron cleanup error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
