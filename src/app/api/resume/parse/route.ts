import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { withCsrfProtection } from "@/lib/route-security";
import { saveUserResume } from "@/repositories/user-repo";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = withCsrfProtection(async (req: NextRequest) => {
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

  let rawText: string;
  const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const result = await parser.getText();
    rawText = result.text;
  } catch (e) {
    console.error("[PDF Parse Error]", e);
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
