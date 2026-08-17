import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerAuthSession } from "@/lib/server-auth";
import { sendSupportTicketEmail } from "@/lib/email";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";
import { env } from "@/lib/env";
import { createSupportTicket } from "@/repositories/support-ticket-repo";

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required to submit a support ticket" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, priority, subject, description, attachmentName, attachmentBase64 } = body;

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Subject line is required" }, { status: 400 });
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const userEmail = session.user.email;
    const userName = session.user.name || session.user.email;
    const safeCategory = category || "general";
    const safePriority = priority || "normal";
    const safeSubject = subject.trim();
    const safeDescription = description.trim();

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

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Ticket submitted successfully",
    });
  } catch (err) {
    logger.error("Error processing support ticket", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
