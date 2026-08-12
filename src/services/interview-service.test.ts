import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { Prisma } from "@/generated/prisma/client";
import { getResumableInterviewSessionState, runInterviewChat, startInterviewSession, updateSessionStatusIfOwned } from "./interview-service";
import { advanceInterviewCurrentQuestion, createInterviewSession, expireInterviewSessionIfStale, getInterviewSession, updateInterviewSessionStatus } from "@/repositories/interview-repo";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";
import { prisma } from "@/lib/prisma";

vi.mock("@/repositories/interview-repo", () => ({
  getInterviewSession: vi.fn(),
  createInterviewSession: vi.fn(),
  advanceInterviewCurrentQuestion: vi.fn(),
  updateInterviewSessionStatus: vi.fn(),
  expireInterviewSessionIfStale: vi.fn(),
}));

vi.mock("@/lib/interview/transcript-service", () => ({
  saveLatestTranscriptEntry: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/groq", () => ({
  groqClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

describe("runInterviewChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves the latest transcript entry before returning done", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(false);
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      status: "IN_PROGRESS",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral-leadership",
      difficulty: "medium",
      persona: null,
      jobDescription: null,
      resumeUrl: null,
      resumeText: null,
      questionCount: 5,
      currentQuestion: 5,
      focusAreas: null,
      sessionPlan: null,
      transcript: [],
    });

    const rawMessages = [
      { role: "assistant", content: "Tell me about a project you led." },
      { role: "user", content: "I led a migration of a monolith into services." },
    ];

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-1",
      rawMessages,
      expectedCurrentQuestion: 5,
    });

    expect(saveLatestTranscriptEntry).toHaveBeenCalledWith({
      interviewId: "int-1",
      currentQuestion: 5,
      messages: rawMessages,
    });
    expect(advanceInterviewCurrentQuestion).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "done",
      data: {
        done: true,
        currentQuestion: 5,
        doneMessage: INTERVIEW_DONE_MESSAGE,
      },
      });
  });

  it("returns a conflict when the client question index is stale", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(false);
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-2",
      status: "IN_PROGRESS",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral-leadership",
      difficulty: "medium",
      persona: null,
      jobDescription: null,
      resumeUrl: null,
      resumeText: null,
      questionCount: 5,
      currentQuestion: 1,
      focusAreas: null,
      sessionPlan: null,
      transcript: [],
    });

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-2",
      rawMessages: [],
      expectedCurrentQuestion: 0,
    });

    expect(saveLatestTranscriptEntry).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "conflict",
      message: "Interview state changed. Please wait for the current question to finish loading and try again.",
      currentQuestion: 1,
    });
  });

  it("rejects an expired interview before transcript or model work", async () => {
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(true);

    const result = await runInterviewChat({
      userId: "user-1",
      interviewId: "int-expired",
      rawMessages: [{ role: "user", content: "answer" }],
      expectedCurrentQuestion: 0,
    });

    expect(result).toEqual({ type: "expired" });
    expect(getInterviewSession).not.toHaveBeenCalled();
    expect(saveLatestTranscriptEntry).not.toHaveBeenCalled();
  });
});

describe("getResumableInterviewSessionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expires an in-progress session at the exact 24-hour cutoff", async () => {
    const now = new Date("2026-08-12T12:00:00.000Z");
    vi.mocked(expireInterviewSessionIfStale).mockResolvedValue(true);

    const result = await getResumableInterviewSessionState({
      userId: "user-1",
      interviewId: "int-expired",
      now,
    });

    expect(result).toEqual({ type: "expired" });
    expect(expireInterviewSessionIfStale).toHaveBeenCalledWith({
      userId: "user-1",
      interviewId: "int-expired",
      cutoff: new Date("2026-08-11T12:00:00.000Z"),
    });
  });
});

describe("startInterviewSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("derives adaptive defaults from onboarding state", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      onboardingGoal: "prepare-for-promo",
      onboardingLevel: "staff-plus",
      onboardingRole: "Staff Engineer",
      onboardingCompany: "Stripe",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
    vi.mocked(createInterviewSession).mockResolvedValue({ id: "int-2" });

    const result = await startInterviewSession({
      userId: "user-1",
      role: "",
      company: null,
      type: "system-design",
      difficulty: "hard",
      persona: "strict",
      questionCount: 15,
    });

    expect(createInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        role: "Staff Engineer",
        company: "Stripe",
        persona: "strict",
        questionCount: 15,
        focusAreas: [
          "system-design fundamentals",
          "trade-off reasoning",
          "leadership scope",
          "decision rationale",
          "organizational trade-offs",
        ],
        sessionPlan: {
          pacing: ["warmup", "core", "challenge"],
          targetLevel: "staff-plus",
          goal: "prepare-for-promo",
          persona: "strict",
          followUpBias: "probe weak answers quickly",
          questionCount: 15,
        },
      })
    );
    expect(result).toEqual({ id: "int-2" });
  });

  it("does not copy a legacy uncurated onboarding company into a new session", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      onboardingGoal: "switch-companies",
      onboardingLevel: "mid-level",
      onboardingRole: "Frontend Engineer",
      onboardingCompany: "Acme",
    } as Awaited<ReturnType<typeof prisma.user.findUnique>>);
    vi.mocked(createInterviewSession).mockResolvedValue({ id: "int-uncurated-company" });

    await startInterviewSession({
      userId: "user-1",
      role: "Frontend Engineer",
      company: null,
      type: "coding-algorithms",
      difficulty: "medium",
    });

    expect(createInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({ company: null }),
    );
  });

  it("falls back to balanced persona and user inputs when onboarding is missing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(createInterviewSession).mockResolvedValue({ id: "int-3" });

    await startInterviewSession({
      userId: "user-2",
      role: "Frontend Engineer",
      company: "Acme",
      type: "behavioral-leadership",
      difficulty: "medium",
    });

    expect(createInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Frontend Engineer",
        company: "Acme",
        persona: "balanced",
        questionCount: 10,
        focusAreas: [
          "behavioral-leadership fundamentals",
          "structured communication",
        ],
        sessionPlan: {
          pacing: ["warmup", "core", "challenge"],
          targetLevel: "medium",
          goal: "switch-companies",
          persona: "balanced",
          followUpBias: "balance encouragement with pressure",
          questionCount: 10,
        },
      })
    );
  });
});

describe("updateSessionStatusIfOwned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a conflict when videoKey uniqueness is violated", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-4",
      status: "IN_PROGRESS",
      type: "coding-algorithms",
      persona: null,
      videoUrl: null,
      videoKey: null,
      questionCount: 10,
      currentQuestion: 0,
    });
    vi.mocked(updateInterviewSessionStatus).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
        meta: { target: ["videoKey"] },
      }),
    );

    const result = await updateSessionStatusIfOwned({
      userId: "user-1",
      interviewId: "int-4",
      videoKey: "user-1/interview-duplicate.webm",
      status: "COMPLETED",
    });

    expect(result).toEqual({
      type: "conflict",
      message: "Video recording is already linked to another interview session.",
    });
  });
});
