import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { evaluateInterviewTranscript } from "@/services/evaluation-service";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/services/evaluation-service", () => ({
  evaluateInterviewTranscript: vi.fn(),
}));

describe("POST /api/interview/evaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));

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
});
