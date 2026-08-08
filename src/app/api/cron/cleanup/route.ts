import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { cleanupExpiredRateLimitBuckets } from "@/lib/rate-limit";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await cleanupExpiredRateLimitBuckets(5_000);
  logger.info("Cron cleanup: removed expired rate-limit buckets", { deleted });
  return NextResponse.json({ deleted });
}
