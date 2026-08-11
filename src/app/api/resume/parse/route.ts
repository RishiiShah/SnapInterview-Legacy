import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { withCsrfProtection } from "@/lib/route-security";
import { withTimeout } from "@/lib/async";
import { saveUserResume } from "@/repositories/user-repo";
import { logger } from "@/utils/logger";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
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
  const identity = await getSessionUserIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasPdfHeader(bytes)) {
    return NextResponse.json({ error: "Only valid PDF files are supported" }, { status: 400 });
  }

  let rawText: string;
  const parser = new PDFParse({ data: bytes });
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
    await parser.destroy();
  }

  const resumeText = rawText
    .replace(/[ \t]{3,}/g, "  ")   // collapse horizontal whitespace runs
    .replace(/\n{3,}/g, "\n\n")     // collapse excessive blank lines
    .trim()
    .slice(0, 8000);                // cap to keep prompt size reasonable

  await saveUserResume(identity.userId, resumeText);

  return NextResponse.json({ resumeText });
});
