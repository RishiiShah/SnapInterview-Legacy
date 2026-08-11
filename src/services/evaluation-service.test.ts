import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateInterviewTranscript, evaluatePracticeQuestion } from "./evaluation-service";
import { groqClient } from "@/lib/ai/groq";
import {
  claimInterviewEvaluation,
  getInterviewSession,
  persistClaimedEvaluation,
  releaseInterviewEvaluationClaim,
} from "@/repositories/interview-repo";
import { getPracticeQuestionById } from "@/repositories/question-repo";
import { buildSystemInstruction } from "@/lib/interview/prompts";

vi.mock("@/repositories/interview-repo", () => ({
  claimInterviewEvaluation: vi.fn(),
  getInterviewSession: vi.fn(),
  persistClaimedEvaluation: vi.fn(),
  releaseInterviewEvaluationClaim: vi.fn(),
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

vi.mock("@/lib/interview/prompts", () => ({
  buildSystemInstruction: vi.fn().mockResolvedValue("Role scoring criteria"),
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
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(1);
    vi.mocked(persistClaimedEvaluation).mockResolvedValue(true);
    vi.mocked(releaseInterviewEvaluationClaim).mockResolvedValue();
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
    expect(persistClaimedEvaluation).not.toHaveBeenCalled();
  });

  it("does not call the model when a fresh evaluation claim already exists", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral-leadership",
      difficulty: "medium",
      persona: "balanced",
      jobDescription: null,
      resumeUrl: null,
      resumeText: null,
      questionCount: 5,
      currentQuestion: 5,
      focusAreas: null,
      sessionPlan: null,
      transcript: [{ question: "Q1", answer: "A1", order: 0 }],
      evaluation: null,
      evaluationStartedAt: new Date(),
      evaluationClaimVersion: 1,
    } as never);
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(null);

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toEqual({ type: "in_progress" });
    expect(groqClient.chat.completions.create).not.toHaveBeenCalled();
  });

  it("releases its claim when the model evaluation fails", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral-leadership",
      difficulty: "medium",
      persona: "balanced",
      jobDescription: null,
      resumeUrl: null,
      resumeText: null,
      questionCount: 5,
      currentQuestion: 5,
      focusAreas: null,
      sessionPlan: null,
      transcript: [{ question: "Q1", answer: "A1", order: 0 }],
      evaluation: null,
      evaluationStartedAt: null,
      evaluationClaimVersion: 0,
    } as never);
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(1);
    vi.mocked(groqClient.chat.completions.create).mockRejectedValue(new Error("provider unavailable"));

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toEqual({ type: "error", message: "Failed to generate interview evaluation" });
    expect(releaseInterviewEvaluationClaim).toHaveBeenCalledWith({
      interviewId: "int-1",
      userId: "user-1",
      claimVersion: 1,
    });
  });

  it("does not report success when a stale owner loses its persistence claim", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral-leadership",
      difficulty: "medium",
      persona: "balanced",
      jobDescription: null,
      resumeUrl: null,
      resumeText: null,
      questionCount: 5,
      currentQuestion: 5,
      focusAreas: null,
      sessionPlan: null,
      transcript: [{ question: "Q1", answer: "A1", order: 0 }],
      evaluation: null,
      evaluationStartedAt: null,
      evaluationClaimVersion: 0,
    } as never);
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(1);
    vi.mocked(persistClaimedEvaluation).mockResolvedValue(false);
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            score: 82,
            feedback: "Clear answers with room for more specificity.",
            strengths: ["Clear communication"],
            areasForImprovement: ["Use more metrics"],
          }),
        },
      }],
    } as never);

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toEqual({ type: "error", message: "Evaluation ownership changed. Please try again." });
    expect(releaseInterviewEvaluationClaim).not.toHaveBeenCalled();
  });

  it("skips question retrieval while generating a fresh final evaluation", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue({
      id: "int-1",
      role: "Frontend Engineer",
      company: null,
      type: "behavioral-leadership",
      difficulty: "medium",
      persona: "balanced",
      jobDescription: null,
      resumeUrl: null,
      resumeText: null,
      questionCount: 5,
      currentQuestion: 5,
      focusAreas: null,
      sessionPlan: null,
      transcript: [{ question: "Q1", answer: "A1", order: 0 }],
      evaluation: null,
    } as never);
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            score: 82,
            feedback: "Clear answers with room for more specificity.",
            strengths: ["Clear communication"],
            areasForImprovement: ["Use more metrics"],
          }),
        },
      }],
    } as never);
    vi.mocked(persistClaimedEvaluation).mockResolvedValue(true);

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toMatchObject({ type: "ok", fresh: true });
    expect(buildSystemInstruction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "int-1", role: "Frontend Engineer" }),
      { includeQuestionRetrieval: false },
    );
  });
});
