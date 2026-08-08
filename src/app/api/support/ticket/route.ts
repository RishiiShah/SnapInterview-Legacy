import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-auth";
import { sendSupportTicketEmail } from "@/lib/email";
import { withCsrfProtection } from "@/lib/route-security";
import { logger } from "@/utils/logger";

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
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

    const ticketId = `SUP-${Math.floor(100000 + Math.random() * 900000)}`;
    const userEmail = session.user.email;
    const userName = session.user.name || session.user.email;

    // Send emails via SMTP
    try {
      await sendSupportTicketEmail({
        ticketId,
        userEmail,
        userName,
        category: category || "general",
        priority: priority || "normal",
        subject: subject.trim(),
        description: description.trim(),
        attachmentName,
        attachmentBase64,
      });
    } catch (emailErr) {
      logger.error("Failed to send support ticket email via SMTP:", emailErr);
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Ticket submitted successfully",
    });
  } catch (err) {
    logger.error("Error processing support ticket:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
