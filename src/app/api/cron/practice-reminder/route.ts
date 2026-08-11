import { type NextRequest, NextResponse } from "next/server";
import { findPracticeReminderRecipients } from "@/repositories/user-repo";
import { sendPracticeReminderEmail } from "@/lib/email";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { mapWithConcurrency } from "@/lib/async";
import { logger } from "@/utils/logger";

const PRACTICE_REMINDER_DELIVERY_CONCURRENCY = 5;

export async function GET(request: NextRequest) {
    if (!isAuthorizedCronRequest(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const recipients = await findPracticeReminderRecipients();
        const deliveryResults = await mapWithConcurrency(
          recipients,
          PRACTICE_REMINDER_DELIVERY_CONCURRENCY,
          async (r) => {
            try {
                await sendPracticeReminderEmail({
                    to: r.email,
                    name: r.name,
                    daysSinceLast: r.daysSinceLast,
                });
                return true;
            } catch (err) {
                logger.error("Practice reminder email failed", {
                    userId: r.userId,
                    error: err instanceof Error ? err.message : String(err),
                });
                return false;
            }
          },
        );
        const sent = deliveryResults.filter(Boolean).length;
        const failed = deliveryResults.length - sent;

        logger.info("Cron practice-reminder complete", { sent, failed, total: recipients.length });
        return NextResponse.json({ sent, failed, total: recipients.length });
    } catch (error) {
        logger.error("Cron practice-reminder error:", {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
