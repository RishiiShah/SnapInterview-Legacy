import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/server-auth", () => ({ getSessionUserIdentity: vi.fn() }));
vi.mock("@/lib/route-security", () => ({
  withCsrfProtection: (handler: unknown) => handler,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: { findFirst: vi.fn() },
    voiceAnalysis: { upsert: vi.fn(), update: vi.fn() },
    voiceTurnAnalysis: { upsert: vi.fn(), findMany: vi.fn() },
  },
}));

const context = { params: Promise.resolve({ id: "11111111-1111-4111-8111-111111111111" }) };
const validTurn = {
  transcriptOrder: 0,
  responseLatencyMs: 900,
  speakingDurationMs: 12_000,
  wordsPerMinute: 130,
  pauseRatio: 0.18,
  energyVariation: 0.24,
  fillerWordCount: 1,
  audioQualityScore: 0.85,
  confidenceScore: 0.8,
};

describe("POST /api/interview/[id]/voice-analysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires authentication", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/interview/id/voice-analysis", {
      method: "POST",
      body: JSON.stringify(validTurn),
    }), context);

    expect(response.status).toBe(401);
  });

  it("persists an owned turn and refreshes bounded aggregate coaching", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "interview-1" } as never);
    vi.mocked(prisma.voiceAnalysis.upsert).mockResolvedValue({ id: "analysis-1" } as never);
    vi.mocked(prisma.voiceTurnAnalysis.findMany).mockResolvedValue([validTurn] as never);

    const response = await POST(new Request("http://localhost/api/interview/id/voice-analysis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validTurn),
    }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "COMPLETED" });
    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: "user-1", deletedAt: null }),
    }));
    expect(prisma.voiceTurnAnalysis.upsert).toHaveBeenCalled();
    expect(prisma.voiceAnalysis.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "COMPLETED", analyzerVersion: "browser-v1" }),
    }));
  });
});

