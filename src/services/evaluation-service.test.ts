import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateInterviewTranscript, evaluatePracticeQuestion } from "./evaluation-service";
import { groqClient } from "@/lib/ai/groq";
import { getInterviewSession, updateEvaluation } from "@/repositories/interview-repo";
import { getPracticeQuestionById } from "@/repositories/question-repo";

vi.mock("@/repositories/interview-repo", () => ({
  getInterviewSession: vi.fn(),
  updateEvaluation: vi.fn(),
}));

vi.mock("@/repositories/question-repo", () => ({
  getPracticeQuestionById: vi.fn(),
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

describe("evaluatePracticeQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found when the repository does not return a question", async () => {
    vi.mocked(getPracticeQuestionById).mockResolvedValue(undefined);

    const result = await evaluatePracticeQuestion({ questionId: 999, answer: "answer" });

    expect(getPracticeQuestionById).toHaveBeenCalledWith(999);
    expect(result).toEqual({ type: "not_found" });
  });

  it("returns the empty-answer response using repository-backed question data", async () => {
    vi.mocked(getPracticeQuestionById).mockResolvedValue({
      id: 1,
      slug: "behavioral-example",
      text: "Tell me about a time you resolved conflict.",
      category: "behavioral",
      difficulty: "medium",
      estimatedTime: "5 min",
      tags: ["communication"],
      hint: "Use STAR.",
    });

    const result = await evaluatePracticeQuestion({ questionId: 1, answer: "   " });

    expect(result).toEqual({
      type: "empty",
      data: {
        score: 0,
        feedback: "No answer submitted. Add a concise story with situation, actions, and measurable outcome.",
      },
    });
  });

  it("parses JSON wrapped in markdown fences from the model", async () => {
    vi.mocked(getPracticeQuestionById).mockResolvedValue({
      id: 1,
      slug: "behavioral-example",
      text: "Tell me about a time you resolved conflict.",
      category: "behavioral",
      difficulty: "medium",
      estimatedTime: "5 min",
      tags: ["communication"],
      hint: "Use STAR.",
    });
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue({
      choices: [{
        message: {
          content: "```json\n{\"score\":88,\"feedback\":\"Strong structure with room for deeper impact.\"}\n```",
        },
      }],
    } as never);

    const result = await evaluatePracticeQuestion({ questionId: 1, answer: "I resolved a team conflict." });

    expect(result).toEqual({
      type: "ok",
      data: {
        score: 88,
        feedback: "Strong structure with room for deeper impact.",
      },
    });
  });
});

describe("evaluateInterviewTranscript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses cached persisted evaluation when it matches the shared contract", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral",
      difficulty: "medium",
      persona: "balanced",
      jobDescription: null,
      resumeUrl: null,
      questionCount: 5,
      currentQuestion: 5,
      focusAreas: null,
      sessionPlan: null,
      transcript: [{ question: "Q1", answer: "A1", order: 0 }],
      evaluation: {
        score: 91,
        feedback: "Great signal.",
        strengths: ["Structured answers"],
        areasForImprovement: ["Add more metrics"],
      },
    } as never);

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toMatchObject({
      type: "ok",
      data: {
        score: 91,
        feedback: "Great signal.",
        strengths: ["Structured answers"],
        areasForImprovement: ["Add more metrics"],
      },
    });
    expect(groqClient.chat.completions.create).not.toHaveBeenCalled();
    expect(updateEvaluation).not.toHaveBeenCalled();
  });
});
