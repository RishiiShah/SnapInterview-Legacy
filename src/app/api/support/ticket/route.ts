import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/server-auth";
import { sendSupportTicketEmail } from "@/lib/email";
import { withCsrfProtection } from "@/lib/route-security";
import { createRateLimiter } from "@/lib/rate-limit";
import { logger } from "@/utils/logger";
import { z } from "zod/v4";

const supportTicketSchema = z.object({
  category: z.enum(["technical", "billing", "account", "feedback"]).default("technical"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  subject: z.string().trim().min(1, "Subject line is required").max(200, "Subject line is too long"),
  description: z.string().trim().min(1, "Description is required").max(10_000, "Description is too long"),
  attachmentName: z.string().trim().min(1).max(255).optional(),
  attachmentBase64: z.string().max(7_000_000, "Attachment is too large").regex(
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    "Attachment must be a PNG, JPG, or WebP image",
  ).optional(),
}).refine(
  (value) => Boolean(value.attachmentName) === Boolean(value.attachmentBase64),
  "Attachment name and image must be supplied together",
);
const supportTicketLimiter = createRateLimiter("support-ticket", 60 * 60 * 1000, 5);
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function getAttachmentType(bytes: Buffer): "png" | "jpeg" | "webp" | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  return null;
}

function validateAttachment(dataUrl: string): { attachmentName: string; attachmentBase64: string } | null {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match || match[2].length % 4 !== 0) return null;

  const declaredType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  const actualType = getAttachmentType(bytes);
  if (!actualType || actualType !== declaredType || bytes.length > MAX_ATTACHMENT_BYTES) return null;

  const extension = actualType === "jpeg" ? "jpg" : actualType;
  return {
    attachmentName: `support-attachment.${extension}`,
    attachmentBase64: `data:image/${actualType};base64,${match[2]}`,
  };
}

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required to submit a support ticket" },
        { status: 401 }
      );
    }

    if (await supportTicketLimiter.isLimited(session.user.id)) {
      return NextResponse.json({ error: "Too many support tickets. Please try again later." }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = supportTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid support ticket" }, { status: 400 });
    }
    const { category, priority, subject, description, attachmentBase64 } = parsed.data;
    const attachment = attachmentBase64 ? validateAttachment(attachmentBase64) : null;
    if (attachmentBase64 && !attachment) {
      return NextResponse.json({ error: "Attachment must be a valid PNG, JPG, or WebP image under 5MB." }, { status: 400 });
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
        subject,
        description,
        attachmentName: attachment?.attachmentName,
        attachmentBase64: attachment?.attachmentBase64,
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
