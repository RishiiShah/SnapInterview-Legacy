import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { verifyMultipartCompletionToken } from "@/lib/s3/multipart-upload-token";
import { startInterviewSession, updateSessionStatusIfOwned } from "@/services/interview-service";
import { warmEmbeddingModel } from "@/lib/rag/embeddings";

const { mockRateLimitState } = vi.hoisted(() => ({
  mockRateLimitState: {
    limitedNamespaces: new Set<string>(),
  },
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/s3/multipart-upload-token", () => ({
  verifyMultipartCompletionToken: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn((namespace: string) => ({
    isLimited: vi.fn(() => mockRateLimitState.limitedNamespaces.has(namespace)),
  })),
}));

vi.mock("@/services/interview-service", () => ({
  startInterviewSession: vi.fn(),
  updateSessionStatusIfOwned: vi.fn(),
  ALLOWED_STATUSES: ["COMPLETED", "ABORTED"],
  ALLOWED_QUESTION_COUNTS: [5, 10, 15],
}));

vi.mock("@/lib/rag/embeddings", () => ({
  warmEmbeddingModel: vi.fn(),
}));

describe("POST /api/interview/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitState.limitedNamespaces.clear();
  });

  it("rejects invalid interview type values", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const request = new Request("http://localhost/api/interview/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        role: "Frontend Engineer",
        type: "invalid-type",
        difficulty: "medium",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid option: expected one of \"recruiter-screen\"|\"behavioral-leadership\"|\"coding-algorithms\"|\"system-design\"|\"domain-role\"|\"take-home\"|\"hiring-manager\"|\"bar-raiser\"",
    });
    expect(startInterviewSession).not.toHaveBeenCalled();
  });

  it("creates a session with validated interview domain values", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(startInterviewSession).mockResolvedValue({ id: "session-1" });

    const request = new Request("http://localhost/api/interview/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        role: "Frontend Engineer",
        company: "Acme",
        type: "coding-algorithms",
        difficulty: "medium",
        persona: "balanced",
        questionCount: 10,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(startInterviewSession).toHaveBeenCalledWith({
      userId: "user-1",
      id: undefined,
      role: "Frontend Engineer",
      company: "Acme",
      type: "coding-algorithms",
      difficulty: "medium",
      persona: "balanced",
      jobDescription: undefined,
      resumeUrl: undefined,
      resumeText: undefined,
      questionCount: 10,
    });
    expect(warmEmbeddingModel).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({ id: "session-1" });
  });

  it("rate limits repeated session creation for one user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    mockRateLimitState.limitedNamespaces.add("interview-session-create");

    const request = new Request("http://localhost/api/interview/session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        role: "Frontend Engineer",
        type: "technical",
        difficulty: "medium",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(startInterviewSession).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/interview/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyMultipartCompletionToken).mockReturnValue(false);
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/session", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111" }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when interview is not owned by the authenticated user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(updateSessionStatusIfOwned).mockResolvedValue({ type: "not_found" });

    const request = new Request("http://localhost/api/interview/session", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ interviewId: "11111111-1111-4111-8111-111111111111", status: "COMPLETED" }),
    });

    const response = await PATCH(request);

    expect(updateSessionStatusIfOwned).toHaveBeenCalledWith({
      userId: "user-1",
      interviewId: "11111111-1111-4111-8111-111111111111",
      videoUrl: undefined,
      videoKey: undefined,
      status: "COMPLETED",
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Interview session not found" });
  });

  it("updates interview session when ownership is valid", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(verifyMultipartCompletionToken).mockReturnValue(true);
    vi.mocked(updateSessionStatusIfOwned).mockResolvedValue({
      type: "ok",
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        videoUrl: null,
        videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
        status: "COMPLETED",
      },
    });

    const request = new Request("http://localhost/api/interview/session", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        interviewId: "11111111-1111-4111-8111-111111111111",
        status: "COMPLETED",
        videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
        videoCompletionToken: "completion-token",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      videoUrl: null,
      videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
      status: "COMPLETED",
    });
    expect(updateSessionStatusIfOwned).toHaveBeenCalledWith({
      userId: "user-1",
      interviewId: "11111111-1111-4111-8111-111111111111",
      videoUrl: undefined,
      videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
      status: "COMPLETED",
    });
  });

  it("rejects completed video metadata without a valid completion token", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(updateSessionStatusIfOwned).mockResolvedValue({
      type: "ok",
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        videoUrl: null,
        videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
        status: "COMPLETED",
      },
    });

    const request = new Request("http://localhost/api/interview/session", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        interviewId: "11111111-1111-4111-8111-111111111111",
        status: "COMPLETED",
        videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(403);
    expect(updateSessionStatusIfOwned).not.toHaveBeenCalled();
  });

  it("rejects client supplied video URLs", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const request = new Request("http://localhost/api/interview/session", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        interviewId: "11111111-1111-4111-8111-111111111111",
        status: "COMPLETED",
        videoUrl: "https://cdn.example.com/video.webm",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(updateSessionStatusIfOwned).not.toHaveBeenCalled();
  });

  it("returns 409 when a video key is already linked elsewhere", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(verifyMultipartCompletionToken).mockReturnValue(true);
    vi.mocked(updateSessionStatusIfOwned).mockResolvedValue({
      type: "conflict",
      message: "Video recording is already linked to another interview session.",
    });

    const request = new Request("http://localhost/api/interview/session", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        interviewId: "11111111-1111-4111-8111-111111111111",
        videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
        videoCompletionToken: "completion-token",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Video recording is already linked to another interview session.",
    });
  });
});
