import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

const { isLimitedMock, getPublishedCodingSearchResultsMock } = vi.hoisted(() => ({
  isLimitedMock: vi.fn().mockResolvedValue(false),
  getPublishedCodingSearchResultsMock: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: { findMany: vi.fn() },
    practiceQuestion: { findMany: vi.fn() },
    codingQuestion: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: isLimitedMock })),
}));

vi.mock("@/repositories/coding-question-repo", () => ({
  getPublishedCodingSearchResults: getPublishedCodingSearchResultsMock,
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

function makeRequest(q?: string) {
  const url = q !== undefined
    ? `http://localhost/api/search?q=${encodeURIComponent(q)}`
    : "http://localhost/api/search";
  return new Request(url);
}

const mockSessions = [
  {
    id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    role: "Software Engineer",
    company: "Acme",
    type: "technical",
    difficulty: "medium",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
];

const mockQuestions = [
  { id: 1, slug: "behavioral-example", text: "Tell me about a time", category: "behavioral", difficulty: "easy" },
];

const mockCodingQuestions = [
  {
    id: "coding-1",
    slug: "reverse-linked-list",
    title: "Reverse a linked list",
    difficulty: "easy",
    topics: ["linked-lists"],
    estimatedTime: "15 min",
  },
];

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "u1", email: "a@b.com" });
    isLimitedMock.mockResolvedValue(false);
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue(mockSessions as never);
    vi.mocked(prisma.practiceQuestion.findMany).mockResolvedValue(mockQuestions as never);
    getPublishedCodingSearchResultsMock.mockResolvedValue(mockCodingQuestions);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const res = await GET(makeRequest("engineer"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when query param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("returns 400 when query is too short (1 char)", async () => {
    const res = await GET(makeRequest("a"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when query exceeds 100 characters", async () => {
    const res = await GET(makeRequest("a".repeat(101)));
    expect(res.status).toBe(400);
  });

  it("returns 400 when rate limited", async () => {
    isLimitedMock.mockResolvedValueOnce(true);
    const res = await GET(makeRequest("engineer"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: /too many/i });
  });

  it("returns matching sessions and questions", async () => {
    const res = await GET(makeRequest("engineer"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0]).toMatchObject({
      id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      role: "Software Engineer",
      company: "Acme",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(body.questions).toHaveLength(2);
    expect(body.questions).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: "reverse-linked-list", type: "coding" }),
      expect.objectContaining({ slug: "behavioral-example", type: "question" }),
    ]));
  });

  it("passes userId and query to session search", async () => {
    await GET(makeRequest("frontend"));

    expect(prisma.interviewSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "u1", status: "COMPLETED" }),
      }),
    );
  });

  it("searches only the four Q&A categories", async () => {
    await GET(makeRequest("frontend"));

    expect(prisma.practiceQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { category: { in: ["behavioral", "technical", "system-design", "leadership"] } },
          ]),
        }),
      }),
    );
  });

  it("reuses the published coding catalog instead of querying full workspaces per search", async () => {
    await GET(makeRequest("linked"));

    expect(getPublishedCodingSearchResultsMock).toHaveBeenCalledWith("linked");
    expect(prisma.codingQuestion.findMany).not.toHaveBeenCalled();
  });

  it("returns empty arrays when no matches found", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.practiceQuestion.findMany).mockResolvedValue([]);
    getPublishedCodingSearchResultsMock.mockResolvedValue([]);

    const res = await GET(makeRequest("zzz"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sessions: [], questions: [] });
  });

  it("returns 500 when DB throws", async () => {
    vi.mocked(prisma.interviewSession.findMany).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest("engineer"));
    expect(res.status).toBe(500);
  });
});
