import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH, POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { startInterviewSession, updateSessionStatusIfOwned } from "@/services/interview-service";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/services/interview-service", () => ({
  startInterviewSession: vi.fn(),
  updateSessionStatusIfOwned: vi.fn(),
  ALLOWED_STATUSES: ["COMPLETED", "ABORTED"],
  ALLOWED_QUESTION_COUNTS: [5, 10, 15],
}));

describe("POST /api/interview/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      error: "Invalid option: expected one of \"behavioral\"|\"technical\"|\"system-design\"|\"leadership\"",
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
        type: "technical",
        difficulty: "medium",
        persona: "balanced",
        questionCount: 10,
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(startInterviewSession).toHaveBeenCalledWith({
      userId: "user-1",
      role: "Frontend Engineer",
      company: "Acme",
      type: "technical",
      difficulty: "medium",
      persona: "balanced",
      jobDescription: undefined,
      resumeUrl: undefined,
      questionCount: 10,
    });
    await expect(response.json()).resolves.toEqual({ id: "session-1" });
  });
});

describe("PATCH /api/interview/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(updateSessionStatusIfOwned).mockResolvedValue({
      type: "ok",
      data: {
        id: "11111111-1111-4111-8111-111111111111",
        videoUrl: "https://cdn.example.com/video.webm",
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
        videoUrl: "https://cdn.example.com/video.webm",
        videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      videoUrl: "https://cdn.example.com/video.webm",
      videoKey: "user-1/interview-11111111-1111-4111-8111-111111111111.webm",
      status: "COMPLETED",
    });
  });

  it("returns 409 when a video key is already linked elsewhere", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
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
        videoKey: "user-1/interview-duplicate.webm",
      }),
    });

    const response = await PATCH(request);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Video recording is already linked to another interview session.",
    });
  });
});
