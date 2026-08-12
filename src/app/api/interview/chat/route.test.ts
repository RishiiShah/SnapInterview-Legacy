import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { runInterviewChat } from "@/services/interview-service";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/services/interview-service", () => ({
  runInterviewChat: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: vi.fn().mockResolvedValue(false),
  })),
}));

describe("POST /api/interview/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", expectedCurrentQuestion: 0, messages: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when interview is not owned by user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(runInterviewChat).mockResolvedValue({ type: "not_found" });

    const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const request = new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({ interviewId: validUuid, expectedCurrentQuestion: 0, messages: [] }),
    });

    const response = await POST(request);

    expect(runInterviewChat).toHaveBeenCalledWith({
        userId: "user-1",
        interviewId: validUuid,
        rawMessages: [],
        expectedCurrentQuestion: 0,
        abortSignal: expect.any(AbortSignal),
      });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Interview session not found" });
  });

  it("returns 403 when origin validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

    const request = new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", expectedCurrentQuestion: 0, messages: [] }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns 409 when the interview state is stale", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(runInterviewChat).mockResolvedValue({
      type: "conflict",
      message: "Interview state changed. Please wait for the current question to finish loading and try again.",
      currentQuestion: 1,
    });

    const request = new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({
        interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        expectedCurrentQuestion: 0,
        messages: [],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Interview state changed. Please wait for the current question to finish loading and try again.",
      currentQuestion: 1,
    });
  });

  it("returns 410 when the interview expired", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(runInterviewChat).mockResolvedValue({ type: "expired" });

    const response = await POST(new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", expectedCurrentQuestion: 0, messages: [] }),
    }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: "This interview expired after 24 hours." });
  });

  it("rejects oversized messages before invoking the interview service", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });

    const response = await POST(new Request("http://localhost/api/interview/chat", {
      method: "POST",
      body: JSON.stringify({
        interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        expectedCurrentQuestion: 0,
        messages: [{ role: "user", content: "x".repeat(10_001) }],
      }),
    }));

    expect(response.status).toBe(400);
    expect(runInterviewChat).not.toHaveBeenCalled();
  });
});
