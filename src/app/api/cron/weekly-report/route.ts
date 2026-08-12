import { type NextRequest, NextResponse } from "next/server";
import { findWeeklyReportRecipients } from "@/repositories/user-repo";
import { sendWeeklyReportEmail } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { mapWithConcurrency } from "@/lib/async";
import { logger } from "@/utils/logger";

// Keep throughput high without creating an unbounded burst against the mail provider.
const WEEKLY_REPORT_DELIVERY_CONCURRENCY = 5;

export async function GET(request: NextRequest) {
    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const recipients = await findWeeklyReportRecipients();
        const deliveryResults = await mapWithConcurrency(
          recipients,
          WEEKLY_REPORT_DELIVERY_CONCURRENCY,
          async (r) => {
            try {
                await sendWeeklyReportEmail({
                    to: r.email,
                    name: r.name,
                    sessionsCount: r.sessionsCount,
                    avgScore: r.avgScore,
                    bestRole: r.bestRole,
                    bestScore: r.bestScore,
                });
                return true;
            } catch (err) {
                logger.error("Weekly report email failed", {
                    userId: r.userId,
                    error: err instanceof Error ? err.message : String(err),
                });
                return false;
            }
          },
        );
        const sent = deliveryResults.filter(Boolean).length;
        const failed = deliveryResults.length - sent;

        logger.info("Cron weekly-report complete", { sent, failed, total: recipients.length });
        return NextResponse.json({ sent, failed, total: recipients.length });
    } catch (error) {
        logger.error("Cron weekly-report error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
