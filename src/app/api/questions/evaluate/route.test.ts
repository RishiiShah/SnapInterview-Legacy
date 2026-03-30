import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { evaluatePracticeQuestion } from "@/services/evaluation-service";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/services/evaluation-service", () => ({
  evaluatePracticeQuestion: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: vi.fn().mockResolvedValue(false),
  })),
}));

describe("POST /api/questions/evaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/questions/evaluate", {
      method: "POST",
      body: JSON.stringify({ questionId: 1, answer: "answer" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when question does not exist", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(evaluatePracticeQuestion).mockResolvedValue({ type: "not_found" });

    const request = new Request("http://localhost/api/questions/evaluate", {
      method: "POST",
      body: JSON.stringify({ questionId: 999, answer: "answer" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Question not found" });
  });
});
