import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { evaluatePracticeQuestion } from "@/services/evaluation-service";

const { isLimitedMock } = vi.hoisted(() => ({
  isLimitedMock: vi.fn().mockResolvedValue(false),
}));

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
    isLimited: isLimitedMock,
  })),
}));

describe("POST /api/questions/evaluate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLimitedMock.mockResolvedValue(false);
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

  it("returns 429 when evaluation requests are rate limited", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    isLimitedMock.mockResolvedValueOnce(true);

    const request = new Request("http://localhost/api/questions/evaluate", {
      method: "POST",
      body: JSON.stringify({ questionId: 1, answer: "answer" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many evaluation requests. Please try again later.",
    });
    expect(evaluatePracticeQuestion).not.toHaveBeenCalled();
  });

  it("returns 502 when the model provider fails", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });
    vi.mocked(evaluatePracticeQuestion).mockResolvedValue({
      type: "upstream_error",
      message: "Failed to generate answer evaluation",
    });

    const request = new Request("http://localhost/api/questions/evaluate", {
      method: "POST",
      body: JSON.stringify({ questionId: 1, answer: "answer" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to generate answer evaluation",
    });
  });

  it("returns 400 when request body is malformed JSON", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "u@example.com" });

    const request = new Request("http://localhost/api/questions/evaluate", {
      method: "POST",
      body: "not-json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON body" });
    expect(evaluatePracticeQuestion).not.toHaveBeenCalled();
  });
});
