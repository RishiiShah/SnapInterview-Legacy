import { describe, expect, it } from "vitest";
import {
  MAX_RESUME_PDF_BYTES,
  getResumeUploadError,
  parseResumeUploadResponse,
  validateResumeFile,
} from "./resume-upload";

describe("validateResumeFile", () => {
  it("rejects files larger than the safe function payload limit before upload", () => {
    const file = new File([new Uint8Array(MAX_RESUME_PDF_BYTES + 1)], "resume.pdf", {
      type: "application/pdf",
    });

    expect(validateResumeFile(file)).toBe("File too large. Choose a PDF smaller than 4 MB.");
  });
});

describe("parseResumeUploadResponse", () => {
  it("turns an empty payload-too-large response into a useful error", async () => {
    const response = new Response(null, { status: 413 });

    await expect(parseResumeUploadResponse(response)).rejects.toThrow(
      "File too large. Choose a PDF smaller than 4 MB.",
    );
  });

  it("does not expose a JSON parsing error when a failed response has no body", async () => {
    const response = new Response(null, { status: 500 });

    await expect(parseResumeUploadResponse(response)).rejects.toThrow(
      "Failed to process resume. Please try again.",
    );
  });

  it("returns parsed resume text from a successful JSON response", async () => {
    const response = new Response(JSON.stringify({ resumeText: "Ada Lovelace" }), {
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseResumeUploadResponse(response)).resolves.toBe("Ada Lovelace");
  });
});

describe("getResumeUploadError", () => {
  it("uses the API error when the response contains one", async () => {
    const response = new Response(JSON.stringify({ error: "Only PDF files are supported" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    await expect(getResumeUploadError(response)).resolves.toBe("Only PDF files are supported");
  });
});
