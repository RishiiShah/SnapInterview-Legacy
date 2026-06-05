import { type NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { logger } from "@/utils/logger";

/** Soft-delete was removed; this cron is retained as a no-op for existing schedules. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Cron cleanup: skipped (soft-delete removed)");
  return NextResponse.json({ deleted: 0, skipped: true });
}
