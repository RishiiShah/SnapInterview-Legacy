import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { cleanupExpiredRateLimitBuckets } from "@/lib/rate-limit";
import { completeExpiredInterviewSessions } from "@/repositories/interview-repo";
import { INTERVIEW_RESUME_WINDOW_MS } from "@/lib/interview/constants";
import { logger } from "@/utils/logger";

const EXPIRED_INTERVIEW_CLEANUP_LIMIT = 500;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - INTERVIEW_RESUME_WINDOW_MS);
    const [deleted, completedInterviews] = await Promise.all([
      cleanupExpiredRateLimitBuckets(5_000),
      completeExpiredInterviewSessions({ cutoff, limit: EXPIRED_INTERVIEW_CLEANUP_LIMIT }),
    ]);
    logger.info("Cron cleanup completed", { deleted, completedInterviews });
    return NextResponse.json({ deleted, completedInterviews });
  } catch (error) {
    logger.error("Cron cleanup error:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
