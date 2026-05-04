import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSharedInterview } from "@/repositories/interview-repo";

vi.mock("@/repositories/interview-repo", () => ({
  getSharedInterview: vi.fn(),
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
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 for empty token", async () => {
    const res = await GET(new Request("http://localhost"), makeParams(""));
    expect(res.status).toBe(404);
    expect(getSharedInterview).not.toHaveBeenCalled();
  });

  it("returns 404 for token exceeding 64 characters", async () => {
    const longToken = "a".repeat(65);
    const res = await GET(new Request("http://localhost"), makeParams(longToken));
    expect(res.status).toBe(404);
    expect(getSharedInterview).not.toHaveBeenCalled();
  });

  it("returns 404 when no interview found for token", async () => {
    vi.mocked(getSharedInterview).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("valid-token"));
    expect(res.status).toBe(404);
  });

  it("returns interview data for a valid token", async () => {
    vi.mocked(getSharedInterview).mockResolvedValue(sharedInterview as never);

    const res = await GET(new Request("http://localhost"), makeParams("valid-token-abc"));
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
    expect(getSharedInterview).toHaveBeenCalledWith("valid-token-abc");
  });

  it("accepts tokens at exactly 64 characters", async () => {
    vi.mocked(getSharedInterview).mockResolvedValue(sharedInterview as never);
    const token = "a".repeat(64);
    const res = await GET(new Request("http://localhost"), makeParams(token));
    expect(res.status).toBe(200);
  });

  it("returns 500 when repo throws", async () => {
    vi.mocked(getSharedInterview).mockRejectedValue(new Error("DB error"));
    const res = await GET(new Request("http://localhost"), makeParams("valid-token"));
    expect(res.status).toBe(500);
  });
});
