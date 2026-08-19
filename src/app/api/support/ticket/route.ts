import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod/v4";
import { getServerAuthSession } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { parseJsonBody } from "@/lib/http/request-body";
import { createRateLimiter } from "@/lib/rate-limit";
import { logger } from "@/utils/logger";
import { env } from "@/lib/env";
import { createSupportTicket } from "@/repositories/support-ticket-repo";
import { sendSupportTicketEmail } from "@/lib/email";

const supportTicketLimiter = createRateLimiter("support-ticket", 15 * 60 * 1000, 10);

const supportTicketSchema = z.object({
  category: z.string().optional(),
  priority: z.string().optional(),
  subject: z.string().trim().min(1, "Subject line is required"),
  description: z.string().trim().min(1, "Description is required"),
  attachmentName: z.string().optional(),
  attachmentBase64: z.string().max(10 * 1024 * 1024, "Attachment is too large").optional(),
});

export const POST = withCsrfProtection(async (request: Request) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required to submit a support ticket" },
        { status: 401 }
      );
    }

    if (await supportTicketLimiter.isLimited(session.user.id)) {
      return NextResponse.json(
        { error: "Too many support ticket requests. Please try again later." },
        { status: 429 }
      );
    }

    const parsed = await parseJsonBody(request, supportTicketSchema);
    if (!parsed.ok) {
      return parsed.response;
    }

    const { category, priority, subject, description, attachmentName, attachmentBase64 } = parsed.data;

    const userEmail = session.user.email;
    const userName = session.user.name || session.user.email;
    const safeCategory = category || "general";
    const safePriority = priority || "normal";
    const safeSubject = subject;
    const safeDescription = description;

    // 1. Attempt to persist ticket in database for guaranteed sequential tracking
    const persisted = await createSupportTicket({
      userId: session.user.id,
      userEmail,
      userName,
      category: safeCategory,
      priority: safePriority,
      subject: safeSubject,
      description: safeDescription,
      attachmentName,
    });

    // Use sequential DB ticket code (e.g. SUP-1001), or collision-free fallback if DB table is unmigrated
    const ticketId = persisted
      ? persisted.ticketCode
      : `SUP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    // 2. Forward support ticket submission to Formspree if configured in .env
    if (env.FORMSPREE_SUPPORT_URL) {
      try {
        await fetch(env.FORMSPREE_SUPPORT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            ticketId,
            email: userEmail,
            name: userName,
            category: safeCategory,
            priority: safePriority,
            subject: safeSubject,
            message: safeDescription,
            _subject: `[Support Ticket #${ticketId}] ${safeSubject} (${safePriority.toUpperCase()})`,
            attachmentName: attachmentName || undefined,
          }),
        });
      } catch (formspreeErr) {
        logger.error("Failed to forward support ticket to Formspree", {
          error: formspreeErr instanceof Error ? formspreeErr.message : String(formspreeErr),
        });
      }
    }

    // 3. Send user confirmation email (and optional direct SMTP notification)
    try {
      await sendSupportTicketEmail({
        ticketId,
        userEmail,
        userName,
        category: safeCategory,
        priority: safePriority,
        subject: safeSubject,
        description: safeDescription,
        attachmentName,
        attachmentBase64,
      });
    } catch (emailErr) {
      logger.error("Failed to send support ticket email via SMTP", {
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    return NextResponse.json({ success: true, message: "Ticket submitted successfully", ticketId });
  } catch (error) {
    logger.error("Error submitting Formspree support ticket", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
