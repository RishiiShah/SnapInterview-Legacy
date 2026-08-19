import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_RESUME_PDF_BYTES,
  getResumeUploadError,
  parseResumeUploadResponse,
  uploadResumeFile,
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

describe("uploadResumeFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an oversized file without sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(
      [new Uint8Array(MAX_RESUME_PDF_BYTES + 1)],
      "oversized.pdf",
      { type: "application/pdf" },
    );

    await expect(uploadResumeFile(file)).rejects.toThrow(
      "File too large. Choose a PDF smaller than 4 MB.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the file once and returns validated resume text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ resumeText: "Built distributed systems." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["pdf"], "resume.pdf", { type: "application/pdf" });

    await expect(uploadResumeFile(file)).resolves.toBe(
      "Built distributed systems.",
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/resume/parse");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("resume")).toBe(file);
  });

  it("rejects a malformed successful payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accepted: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      uploadResumeFile(new File(["pdf"], "resume.pdf", { type: "application/pdf" })),
    ).rejects.toThrow("Failed to process resume. Please try again.");
  });
});
