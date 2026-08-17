import { NextRequest, NextResponse } from "next/server";
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { withTimeout } from "@/lib/async";
import { saveUserResume } from "@/repositories/user-repo";
import { logger } from "@/utils/logger";
import { MAX_RESUME_PDF_BYTES, MAX_RESUME_PDF_LABEL } from "@/lib/resume-upload";
import { sanitizeResumeText } from "@/lib/resume/sanitizer";

const PDF_PARSE_TIMEOUT_MS = 10_000;
const resumeParseLimiter = createRateLimiter("resume-parse", 15 * 60 * 1000, 10);

function hasPdfHeader(bytes: Uint8Array) {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export const POST = withCsrfProtection(async (req: NextRequest) => {
  let userId: string | undefined;

  try {
    const identity = await getSessionUserIdentity();
    if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = identity.userId;

    if (await resumeParseLimiter.isLimited(identity.userId)) {
      return NextResponse.json(
        { error: "Too many resume parsing requests. Please try again later." },
        { status: 429 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("resume") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }
    if (file.size > MAX_RESUME_PDF_BYTES) {
      return NextResponse.json({ error: `File too large (max ${MAX_RESUME_PDF_LABEL})` }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfHeader(bytes)) {
      return NextResponse.json({ error: "Only valid PDF files are supported" }, { status: 400 });
    }

    let rawText: string;
    const parser = new PDFParse({ data: bytes, CanvasFactory });
    try {
      const result = await withTimeout(
        parser.getText(),
        PDF_PARSE_TIMEOUT_MS,
        "PDF parse timeout"
      );
      rawText = result.text;
    } catch (e) {
      logger.error("PDF parse error", {
        error: e instanceof Error ? e.message : String(e),
        userId: identity.userId,
      });
      return NextResponse.json(
        { error: "Could not read PDF. Make sure it is a valid, text-based PDF." },
        { status: 422 }
      );
    } finally {
      try {
        await parser.destroy();
      } catch (e) {
        logger.error("PDF parser cleanup error", {
          error: e instanceof Error ? e.message : String(e),
          userId: identity.userId,
        });
      }
    }

    const sanitized = sanitizeResumeText(rawText);
    const resumeText = sanitized.slice(0, 8000);

    await saveUserResume(identity.userId, resumeText);

    return NextResponse.json({ resumeText });
  } catch (e) {
    logger.error("Resume processing error", {
      error: e instanceof Error ? e.message : String(e),
      userId,
    });
    return NextResponse.json({ error: "Failed to process resume. Please try again." }, { status: 500 });
  }
});
