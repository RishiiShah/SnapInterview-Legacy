import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { saveUserResume } from "@/repositories/user-repo";
import { logger } from "@/utils/logger";

const { pdfGetText, pdfDestroy } = vi.hoisted(() => ({
  pdfGetText: vi.fn(),
  pdfDestroy: vi.fn().mockResolvedValue(undefined),
}));

const { mockRateLimitState } = vi.hoisted(() => ({
  mockRateLimitState: {
    limited: false,
  },
}));

vi.mock("pdf-parse", () => ({
  PDFParse: class MockPDFParse {
    getText = pdfGetText;
    destroy = pdfDestroy;
    constructor() {}
  },
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn().mockReturnValue(null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/repositories/user-repo", () => ({
  saveUserResume: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: vi.fn(() => mockRateLimitState.limited),
  })),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

const MAX_SIZE = 5 * 1024 * 1024;

function makePdfFile(sizeBytes = 1024, name = "resume.pdf") {
  const bytes = new Uint8Array(sizeBytes);
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
  return new File([bytes], name, { type: "application/pdf" });
}

function makeRequest(file?: File | null) {
  const fd = new FormData();
  if (file !== null) {
    fd.append("resume", file ?? makePdfFile());
  }
  return new Request("http://localhost/api/resume/parse", { method: "POST", body: fd });
}

describe("POST /api/resume/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitState.limited = false;
    pdfDestroy.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is attached", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await POST(makeRequest(null) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /no file/i });
  });

  it("returns 400 when file is not a PDF", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const file = new File(["hello"], "resume.txt", { type: "text/plain" });
    const res = await POST(makeRequest(file) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /pdf/i });
  });

  it("returns 400 when a file spoofs the PDF MIME type without a PDF header", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const file = new File(["not a pdf"], "resume.pdf", { type: "application/pdf" });

    const res = await POST(makeRequest(file) as never);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /pdf/i });
    expect(pdfGetText).not.toHaveBeenCalled();
  });

  it("rate limits repeated parsing attempts for one user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    mockRateLimitState.limited = true;

    const res = await POST(makeRequest() as never);

    expect(res.status).toBe(429);
    expect(pdfGetText).not.toHaveBeenCalled();
  });

  it("returns 400 when file exceeds 5 MB", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const oversized = makePdfFile(MAX_SIZE + 1);
    const res = await POST(makeRequest(oversized) as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /too large/i });
  });

  it("parses PDF and saves trimmed resume text", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    pdfGetText.mockResolvedValue({ text: "  John Doe\n\n\n\nSoftware Engineer  " });

    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.resumeText).toBe("John Doe\n\nSoftware Engineer");
    expect(saveUserResume).toHaveBeenCalledWith("u1", "John Doe\n\nSoftware Engineer");
    expect(pdfDestroy).toHaveBeenCalled();
  });

  it("caps resume text at 8000 characters", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    pdfGetText.mockResolvedValue({ text: "x".repeat(10000) });

    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.resumeText).toHaveLength(8000);
  });

  it("returns 422 when PDFParse throws", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    pdfGetText.mockRejectedValue(new Error("Invalid PDF"));

    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: /valid.*pdf/i });
    expect(pdfDestroy).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("PDF parse error", expect.objectContaining({
      error: "Invalid PDF",
      userId: "u1",
    }));
    consoleErrorSpy.mockRestore();
  });

  it("calls destroy even when parsing succeeds", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    pdfGetText.mockResolvedValue({ text: "Resume content" });

    await POST(makeRequest() as never);
    expect(pdfDestroy).toHaveBeenCalledOnce();
  });
});
