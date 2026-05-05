import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { saveUserResume } from "@/repositories/user-repo";

const { pdfGetText, pdfDestroy } = vi.hoisted(() => ({
  pdfGetText: vi.fn(),
  pdfDestroy: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

const MAX_SIZE = 5 * 1024 * 1024;

function makePdfFile(sizeBytes = 1024, name = "resume.pdf") {
  return new File([new Uint8Array(sizeBytes)], name, { type: "application/pdf" });
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
    pdfGetText.mockRejectedValue(new Error("Invalid PDF"));

    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: /valid.*pdf/i });
    expect(pdfDestroy).toHaveBeenCalled();
  });

  it("calls destroy even when parsing succeeds", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    pdfGetText.mockResolvedValue({ text: "Resume content" });

    await POST(makeRequest() as never);
    expect(pdfDestroy).toHaveBeenCalledOnce();
  });
});
