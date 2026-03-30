import { NextRequest, NextResponse } from "next/server";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const csrfError = csrfRejectIfInvalid(req);
  if (csrfError) return csrfError;

  const identity = await getSessionUserIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("resume") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    rawText = result.text;
  } catch {
    return NextResponse.json(
      { error: "Could not read PDF. Make sure it is a valid, text-based PDF." },
      { status: 422 }
    );
  }

  const resumeText = rawText
    .replace(/[ \t]{3,}/g, "  ")   // collapse horizontal whitespace runs
    .replace(/\n{3,}/g, "\n\n")     // collapse excessive blank lines
    .trim()
    .slice(0, 8000);                // cap to keep prompt size reasonable

  return NextResponse.json({ resumeText });
}
