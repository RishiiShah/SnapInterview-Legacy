import { type NextRequest, NextResponse } from "next/server";
import { findPracticeReminderRecipients } from "@/repositories/user-repo";
import { sendPracticeReminderEmail } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const recipients = await findPracticeReminderRecipients();
        let sent = 0;
        let failed = 0;

        for (const r of recipients) {
            try {
                await sendPracticeReminderEmail({
                    to: r.email,
                    name: r.name,
                    daysSinceLast: r.daysSinceLast,
                });
                sent++;
            } catch (err) {
                failed++;
                logger.error("Practice reminder email failed", {
                    userId: r.userId,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        logger.info("Cron practice-reminder complete", { sent, failed, total: recipients.length });
        return NextResponse.json({ sent, failed, total: recipients.length });
    } catch (error) {
        logger.error("Cron practice-reminder error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
