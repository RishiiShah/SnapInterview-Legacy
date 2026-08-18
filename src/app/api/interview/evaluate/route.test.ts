import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { evaluateInterviewTranscript } from "@/services/evaluation-service";

const { isLimitedMock } = vi.hoisted(() => ({
  isLimitedMock: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/services/evaluation-service", () => ({
  evaluateInterviewTranscript: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: isLimitedMock,
  })),
}));

describe("POST /api/interview/evaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLimitedMock.mockResolvedValue(false);
  });

  it("returns 403 when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when interview is not owned by user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(evaluateInterviewTranscript).mockResolvedValue({ type: "not_found" });

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Interview session not found" });
  });

  it("returns 400 when transcript is missing", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(evaluateInterviewTranscript).mockResolvedValue({ type: "no_transcript" });

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "No transcript found for this interview" });
  });

  it("returns 409 without starting a duplicate evaluation", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(evaluateInterviewTranscript).mockResolvedValue({ type: "in_progress" });

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Evaluation is already in progress. Please retry shortly.",
    });
  });

  it("returns 429 when evaluation requests are rate limited", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    isLimitedMock.mockResolvedValueOnce(true);

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many evaluation requests. Please try again later.",
    });
    expect(evaluateInterviewTranscript).not.toHaveBeenCalled();
  });

  it("returns 502 for model-provider failure", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(evaluateInterviewTranscript).mockResolvedValue({
      type: "upstream_error",
      message: "Failed to generate interview evaluation",
    });

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to generate interview evaluation",
    });
  });

  it("preserves the safe 400 mapping for invalid persisted session data", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(evaluateInterviewTranscript).mockResolvedValue({
      type: "invalid_session",
      message: "Interview session is invalid. Please start a new session.",
    });

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Interview session is invalid. Please start a new session.",
    });
  });

  it("returns 400 when request body is malformed JSON", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });

    const request = new Request("http://localhost/api/interview/evaluate", {
      method: "POST",
      body: "not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
    expect(evaluateInterviewTranscript).not.toHaveBeenCalled();
  });
});
