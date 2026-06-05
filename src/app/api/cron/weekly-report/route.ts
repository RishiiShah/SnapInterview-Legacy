import { type NextRequest, NextResponse } from "next/server";
import { findWeeklyReportRecipients } from "@/repositories/user-repo";
import { sendWeeklyReportEmail } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const recipients = await findWeeklyReportRecipients();
        let sent = 0;
        let failed = 0;

        for (const r of recipients) {
            try {
                await sendWeeklyReportEmail({
                    to: r.email,
                    name: r.name,
                    sessionsCount: r.sessionsCount,
                    avgScore: r.avgScore,
                    bestRole: r.bestRole,
                    bestScore: r.bestScore,
                });
                sent++;
            } catch (err) {
                failed++;
                logger.error("Weekly report email failed", {
                    userId: r.userId,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        logger.info("Cron weekly-report complete", { sent, failed, total: recipients.length });
        return NextResponse.json({ sent, failed, total: recipients.length });
    } catch (error) {
        logger.error("Cron weekly-report error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
