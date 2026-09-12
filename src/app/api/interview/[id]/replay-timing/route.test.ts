import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/server-auth", () => ({ getSessionUserIdentity: vi.fn() }));
vi.mock("@/lib/route-security", () => ({ withCsrfProtection: (handler: unknown) => handler }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: { findFirst: vi.fn() },
    interviewReplayTurn: { upsert: vi.fn() },
  },
}));

const context = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) };

describe("POST /api/interview/[id]/replay-timing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists timing only for an interview owned by the user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "interview-1" } as never);

    const response = await POST(new Request("http://localhost/api/interview/id/replay-timing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcriptOrder: 0, answerStartMs: 4_200, confidenceScore: 0.9 }),
    }), context);

    expect(response.status).toBe(200);
    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: "user-1", deletedAt: null }),
    }));
    expect(prisma.interviewReplayTurn.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ transcriptOrder: 0, answerStartMs: 4_200 }),
    }));
  });

  it("rejects timestamp-free payloads", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    const response = await POST(new Request("http://localhost/api/interview/id/replay-timing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcriptOrder: 0 }),
    }), context);

    expect(response.status).toBe(400);
    expect(prisma.interviewReplayTurn.upsert).not.toHaveBeenCalled();
  });
});

