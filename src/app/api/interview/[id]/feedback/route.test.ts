import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getInterviewSession, upsertQuestionFeedback } from "@/repositories/interview-repo";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/repositories/interview-repo", () => ({
  getInterviewSession: vi.fn(),
  upsertQuestionFeedback: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

const VALID_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const INVALID_ID = "not-a-uuid";

function makeRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/interview/[id]/feedback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when CSRF fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) as never,
    );
    const res = await POST(makeRequest({ questionOrder: 0, rating: "up" }), makeParams(VALID_ID));
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await POST(makeRequest({ questionOrder: 0, rating: "up" }), makeParams(VALID_ID));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid interview id", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await POST(makeRequest({ questionOrder: 0, rating: "up" }), makeParams(INVALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const req = new Request("http://localhost", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req, makeParams(VALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await POST(makeRequest({ questionOrder: 0 }), makeParams(VALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid rating value", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    const res = await POST(makeRequest({ questionOrder: 0, rating: "neutral" }), makeParams(VALID_ID));
    expect(res.status).toBe(400);
  });

  it("returns 404 when interview session not found", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getInterviewSession).mockResolvedValue(null);
    const res = await POST(makeRequest({ questionOrder: 0, rating: "up" }), makeParams(VALID_ID));
    expect(res.status).toBe(404);
  });

  it("saves feedback and returns success for 'up' rating", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getInterviewSession).mockResolvedValue({ id: VALID_ID } as never);
    vi.mocked(upsertQuestionFeedback).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ questionOrder: 2, rating: "up" }), makeParams(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(upsertQuestionFeedback).toHaveBeenCalledWith({
      interviewSessionId: VALID_ID,
      questionOrder: 2,
      rating: "up",
    });
  });

  it("saves feedback and returns success for 'down' rating", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getInterviewSession).mockResolvedValue({ id: VALID_ID } as never);
    vi.mocked(upsertQuestionFeedback).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ questionOrder: 0, rating: "down" }), makeParams(VALID_ID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    vi.mocked(getInterviewSession).mockResolvedValue({ id: VALID_ID } as never);
    vi.mocked(upsertQuestionFeedback).mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ questionOrder: 1, rating: "up" }), makeParams(VALID_ID));
    expect(res.status).toBe(500);
  });
});
