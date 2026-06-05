import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { getQuestionFeedbackForSession } from "@/repositories/interview-repo";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findFirst: vi.fn(),
    },
    questionFeedback: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/repositories/interview-repo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/repositories/interview-repo")>();
  return {
    ...actual,
    getQuestionFeedbackForSession: vi.fn().mockResolvedValue([]),
  };
});

describe("GET /api/interview/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getQuestionFeedbackForSession).mockResolvedValue([]);
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/00000000-0000-0000-0000-000000000000");
    const response = await GET(request, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid interview id", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    // IDs are cuids, so any non-empty string is accepted; only an empty id is rejected.
    const request = new Request("http://localhost/api/interview/");
    const response = await GET(request, {
      params: Promise.resolve({ id: "" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid interview ID" });
  });

  it("returns 404 when session is not owned by user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue(null);

    const interviewId = "11111111-1111-4111-8111-111111111111";
    const request = new Request(`http://localhost/api/interview/${interviewId}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: interviewId }),
    });

    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: interviewId, userId: "user-1" },
      })
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Interview session not found" });
  });

  it("sanitizes invalid persisted evaluation payloads before returning them", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      role: "Frontend Engineer",
      type: "technical",
      difficulty: "medium",
      evaluation: { score: "bad-data", feedback: 123 },
      createdAt: new Date("2026-03-15T00:00:00.000Z"),
      transcript: [],
    } as never);

    const interviewId = "11111111-1111-4111-8111-111111111111";
    const request = new Request(`http://localhost/api/interview/${interviewId}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: interviewId }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: interviewId,
      evaluation: null,
      feedback: [],
    });
  });
});
