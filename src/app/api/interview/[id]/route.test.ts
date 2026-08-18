import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { getQuestionFeedbackForSession, softDeleteInterviewSession } from "@/repositories/interview-repo";
import { deleteS3Object } from "@/lib/s3/videos";
import { csrfRejectIfInvalid } from "@/lib/csrf";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
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
    softDeleteInterviewSession: vi.fn(),
  };
});

vi.mock("@/lib/s3/videos", () => ({
  deleteS3Object: vi.fn(),
}));

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

    const request = new Request("http://localhost/api/interview/not-a-uuid");
    const response = await GET(request, {
      params: Promise.resolve({ id: "not-a-uuid" }),
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
        where: { id: interviewId, userId: "user-1", deletedAt: null },
      })
    );
    expect(getQuestionFeedbackForSession).not.toHaveBeenCalled();
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
      questionFeedback: [],
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

describe("DELETE /api/interview/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
  });

  it("soft deletes the owned session without hard-deleting data or S3 objects", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(softDeleteInterviewSession).mockResolvedValue(true);

    const interviewId = "11111111-1111-4111-8111-111111111111";
    const response = await DELETE(
      new Request(`http://localhost/api/interview/${interviewId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: interviewId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(softDeleteInterviewSession).toHaveBeenCalledWith({
      interviewId,
      userId: "user-1",
    });
    expect(prisma.interviewSession.delete).not.toHaveBeenCalled();
    expect(prisma.interviewSession.deleteMany).not.toHaveBeenCalled();
    expect(deleteS3Object).not.toHaveBeenCalled();
  });

  it("preserves the safe not-found response for an absent active session", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(softDeleteInterviewSession).mockResolvedValue(false);

    const interviewId = "11111111-1111-4111-8111-111111111111";
    const response = await DELETE(
      new Request(`http://localhost/api/interview/${interviewId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: interviewId }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Interview session not found" });
  });
});
