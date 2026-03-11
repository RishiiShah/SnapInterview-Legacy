import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTERVIEW_DONE_MESSAGE } from "@/lib/interview/constants";
import { runInterviewChat, startInterviewSession } from "./interview-service";
import { createInterviewSession, getInterviewSession, incrementCurrentQuestion } from "@/repositories/interview-repo";
import { saveLatestTranscriptEntry } from "@/lib/interview/transcript-service";
import { prisma } from "@/lib/prisma";

vi.mock("@/repositories/interview-repo", () => ({
  getInterviewSession: vi.fn(),
  createInterviewSession: vi.fn(),
  incrementCurrentQuestion: vi.fn(),
  updateInterviewSessionStatus: vi.fn(),
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
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral",
      difficulty: "medium",
      persona: null,
      jobDescription: null,
      resumeUrl: null,
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
    });

    expect(saveLatestTranscriptEntry).toHaveBeenCalledWith({
      interviewId: "int-1",
      currentQuestion: 5,
      messages: rawMessages,
    });
    expect(incrementCurrentQuestion).not.toHaveBeenCalled();
    expect(result).toEqual({
      type: "done",
      data: {
        done: true,
        currentQuestion: 5,
        doneMessage: INTERVIEW_DONE_MESSAGE,
      },
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

  it("falls back to balanced persona and user inputs when onboarding is missing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(createInterviewSession).mockResolvedValue({ id: "int-3" });

    await startInterviewSession({
      userId: "user-2",
      role: "Frontend Engineer",
      company: "Acme",
      type: "behavioral",
      difficulty: "medium",
    });

    expect(createInterviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "Frontend Engineer",
        company: "Acme",
        persona: "balanced",
        questionCount: 10,
        focusAreas: [
          "behavioral fundamentals",
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
