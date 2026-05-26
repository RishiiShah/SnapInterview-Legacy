import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSharedInterview } from "@/repositories/interview-repo";

const { mockRateLimitState } = vi.hoisted(() => ({
  mockRateLimitState: {
    limited: false,
  },
}));

vi.mock("@/repositories/interview-repo", () => ({
  getSharedInterview: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({
    isLimited: vi.fn(() => mockRateLimitState.limited),
  })),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

function makeParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

const sharedInterview = {
  role: "Software Engineer",
  company: "Acme",
  type: "technical",
  difficulty: "medium",
  evaluation: { score: 82, feedback: "Good performance", strengths: [], areasForImprovement: [] },
  createdAt: new Date("2026-04-01T10:00:00Z"),
};

describe("GET /api/share/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitState.limited = false;
  });

  it("returns 404 for empty token", async () => {
    const res = await GET(new Request("http://localhost"), makeParams(""));
    expect(res.status).toBe(404);
    expect(getSharedInterview).not.toHaveBeenCalled();
  });

  it("returns 404 for token exceeding the generated token length", async () => {
    const longToken = "a".repeat(33);
    const res = await GET(new Request("http://localhost"), makeParams(longToken));
    expect(res.status).toBe(404);
    expect(getSharedInterview).not.toHaveBeenCalled();
  });

  it("returns 404 for non-hex tokens without hitting the repository", async () => {
    const res = await GET(new Request("http://localhost"), makeParams("valid-token-abc"));
    expect(res.status).toBe(404);
    expect(getSharedInterview).not.toHaveBeenCalled();
  });

  it("returns 404 when no interview found for token", async () => {
    vi.mocked(getSharedInterview).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("a".repeat(32)));
    expect(res.status).toBe(404);
  });

  it("returns interview data for a valid token", async () => {
    vi.mocked(getSharedInterview).mockResolvedValue(sharedInterview as never);
    const token = "b".repeat(32);

    const res = await GET(new Request("http://localhost"), makeParams(token));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      role: "Software Engineer",
      company: "Acme",
      type: "technical",
      difficulty: "medium",
      evaluation: { score: 82 },
      createdAt: "2026-04-01T10:00:00.000Z",
    });
    expect(getSharedInterview).toHaveBeenCalledWith(token);
  });

  it("accepts tokens at exactly 32 hex characters", async () => {
    vi.mocked(getSharedInterview).mockResolvedValue(sharedInterview as never);
    const token = "a".repeat(32);
    const res = await GET(new Request("http://localhost"), makeParams(token));
    expect(res.status).toBe(200);
  });

  it("rate limits public share token probes before repository lookup", async () => {
    mockRateLimitState.limited = true;
    const token = "c".repeat(32);

    const res = await GET(new Request("http://localhost"), makeParams(token));

    expect(res.status).toBe(429);
    expect(getSharedInterview).not.toHaveBeenCalled();
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(getSharedInterview).mockRejectedValue(new Error("DB error"));
    const res = await GET(new Request("http://localhost"), makeParams("d".repeat(32)));
    expect(res.status).toBe(500);
  });
});
