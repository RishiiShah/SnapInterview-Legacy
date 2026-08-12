import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { createRateLimiter } from "@/lib/rate-limit";
import { logger } from "@/utils/logger";
import { z } from "zod/v4";

const FORMSPREE_SUPPORT_ENDPOINT = "https://formspree.io/f/xwlebndz";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const supportTicketSchema = z.object({
  category: z.enum(["technical", "coding", "billing", "account", "feedback"]).default("technical"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  subject: z.string().trim().min(1, "Subject line is required").max(200, "Subject line is too long"),
  description: z.string().trim().min(1, "Description is required").max(10_000, "Description is too long"),
});
const supportTicketLimiter = createRateLimiter("support-ticket", 60 * 60 * 1000, 5);

function getAttachmentType(bytes: Uint8Array): "png" | "jpeg" | "webp" | null {
  const matches = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (bytes.length >= 8 && matches(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "png";
  if (bytes.length >= 3 && matches(0xff, 0xd8, 0xff)) return "jpeg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

async function validateAttachment(file: File): Promise<File | null> {
  if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = getAttachmentType(bytes);
  if (!type) return null;

  const extension = type === "jpeg" ? "jpg" : type;
  const contentType = type === "jpeg" ? "image/jpeg" : `image/${type}`;
  return new File([bytes], `support-attachment.${extension}`, { type: contentType });
}

export const POST = withCsrfProtection(async (request: Request) => {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Authentication required to submit a support ticket" }, { status: 401 });
    }
    if (await supportTicketLimiter.isLimited(session.user.id)) {
      return NextResponse.json({ error: "Too many support tickets. Please try again later." }, { status: 429 });
    }

    let body: FormData;
    try {
      body = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form submission" }, { status: 400 });
    }

    const parsed = supportTicketSchema.safeParse({
      category: body.get("category"),
      priority: body.get("priority"),
      subject: body.get("subject"),
      description: body.get("description"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid support ticket" }, { status: 400 });
    }

    const rawAttachment = body.get("attachment");
    if (rawAttachment !== null && !(rawAttachment instanceof File)) {
      return NextResponse.json({ error: "Attachment must be an image file" }, { status: 400 });
    }
    const attachment = rawAttachment instanceof File ? await validateAttachment(rawAttachment) : null;
    if (rawAttachment instanceof File && !attachment) {
      return NextResponse.json({ error: "Attachment must be a valid PNG, JPG, or WebP image under 5MB." }, { status: 400 });
    }

    const formspreeBody = new FormData();
    formspreeBody.set("email", session.user.email);
    formspreeBody.set("name", session.user.name || session.user.email);
    formspreeBody.set("subject", parsed.data.subject);
    formspreeBody.set("message", parsed.data.description);
    formspreeBody.set("category", parsed.data.category);
    formspreeBody.set("priority", parsed.data.priority);
    if (attachment) formspreeBody.set("attachment", attachment);

    const response = await fetch(FORMSPREE_SUPPORT_ENDPOINT, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formspreeBody,
    });
    if (!response.ok) {
      logger.error("Formspree ticket submission failed", { status: response.status });
      return NextResponse.json({ error: "Unable to submit your ticket right now. Please try again shortly." }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: "Ticket submitted successfully" });
  } catch (error) {
    logger.error("Error submitting Formspree support ticket", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
