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
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";

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
  buildQuestionEvaluationRoleContext: vi.fn().mockResolvedValue("Role scoring criteria"),
}));

vi.mock("@/lib/interview/metrics", () => ({
  invalidateInterviewMetricsCache: vi.fn(),
}));

const PRACTICE_QUESTION = {
  id: 1,
  slug: "behavioral-example",
  text: "Tell me about a time you resolved conflict.",
  category: "behavioral" as const,
  difficulty: "medium" as const,
  estimatedTime: "5 min",
  tags: ["communication"],
  hint: "Use STAR.",
};

function evalSession(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  } as never;
}

function groqContent(content: string | null) {
  return { choices: [{ message: { content } }] } as never;
}

const LEGACY_EVAL = {
  score: 82,
  feedback: "Clear answers with room for more specificity.",
  strengths: ["Clear communication"],
  areasForImprovement: ["Use more metrics"],
};

const V2_EVAL = {
  version: 2,
  overallScore: 82,
  verdict: "hire",
  estimatedLevel: "staff-plus",
  levelRationale: "The candidate demonstrates staff-level technical judgment.",
  companySignals: {},
  dimensions: [],
  executiveSummary: "Clear answers with room for more specificity.",
  keyStrengths: [],
  criticalGaps: [],
  recommendedPreparation: [],
};

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
    vi.mocked(getPracticeQuestionById).mockResolvedValue(PRACTICE_QUESTION);

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
    vi.mocked(getPracticeQuestionById).mockResolvedValue(PRACTICE_QUESTION);
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue(
      groqContent("```json\n{\"score\":88,\"feedback\":\"Strong structure with room for deeper impact.\"}\n```"),
    );

    const result = await evaluatePracticeQuestion({ questionId: 1, answer: "I resolved a team conflict." });

    expect(result).toEqual({
      type: "ok",
      data: {
        score: 88,
        feedback: "Strong structure with room for deeper impact.",
      },
    });
  });

  it("returns upstream_error when the model provider rejects", async () => {
    vi.mocked(getPracticeQuestionById).mockResolvedValue(PRACTICE_QUESTION);
    vi.mocked(groqClient.chat.completions.create).mockRejectedValue(new Error("provider unavailable"));

    const result = await evaluatePracticeQuestion({ questionId: 1, answer: "I resolved a conflict." });

    expect(result).toEqual({
      type: "upstream_error",
      message: "Failed to generate answer evaluation",
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
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({
      type: "behavioral",
      evaluation: {
        score: 91,
        feedback: "Great signal.",
        strengths: ["Structured answers"],
        areasForImprovement: ["Add more metrics"],
      },
    }));

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
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({
      evaluationStartedAt: new Date(),
      evaluationClaimVersion: 1,
    }));
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(null);

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toEqual({ type: "in_progress" });
    expect(groqClient.chat.completions.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "the model evaluation fails",
      claimVersion: 1,
      create: () => Promise.reject(new Error("provider unavailable")),
    },
    {
      name: "the provider returns empty content",
      claimVersion: 7,
      create: () => Promise.resolve(groqContent(null)),
    },
    {
      name: "provider JSON cannot be parsed",
      claimVersion: 9,
      create: () => Promise.resolve(groqContent("not-json")),
    },
  ])("releases its claim when $name", async ({ claimVersion, create }) => {
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({ evaluationClaimVersion: claimVersion - 1 }));
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(claimVersion);
    vi.mocked(groqClient.chat.completions.create).mockImplementation(create as never);

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toEqual({
      type: "upstream_error",
      message: "Failed to generate interview evaluation",
    });
    expect(releaseInterviewEvaluationClaim).toHaveBeenCalledWith({
      interviewId: "int-1",
      userId: "user-1",
      claimVersion,
    });
  });

  it("does not report success when a stale owner loses its persistence claim", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({ evaluationClaimVersion: 0 }));
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(1);
    vi.mocked(persistClaimedEvaluation).mockResolvedValue(false);
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue(groqContent(JSON.stringify(LEGACY_EVAL)));

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toEqual({ type: "invalid_session", message: "Evaluation ownership changed. Please try again." });
    expect(releaseInterviewEvaluationClaim).not.toHaveBeenCalled();
  });

  it("returns invalid_session for persisted domain values that cannot be normalized", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({ type: "unsupported-interview-type" }));

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toEqual({
      type: "invalid_session",
      message: "Interview session is invalid. Please start a new session.",
    });
    expect(claimInterviewEvaluation).not.toHaveBeenCalled();
    expect(groqClient.chat.completions.create).not.toHaveBeenCalled();
  });

  it("does not release a persisted evaluation when cache invalidation fails", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({ evaluationClaimVersion: 3 }));
    vi.mocked(claimInterviewEvaluation).mockResolvedValue(4);
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue(groqContent(JSON.stringify(LEGACY_EVAL)));
    vi.mocked(invalidateInterviewMetricsCache).mockImplementationOnce(() => {
      throw new Error("cache unavailable");
    });

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(releaseInterviewEvaluationClaim).not.toHaveBeenCalled();
    expect(result).toMatchObject({ type: "ok", fresh: true });
  });

  it("skips question retrieval while generating a fresh final evaluation", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession());
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue(groqContent(JSON.stringify(LEGACY_EVAL)));

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toMatchObject({ type: "ok", fresh: true });
    expect(buildSystemInstruction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "int-1", role: "Frontend Engineer" }),
      { includeQuestionRetrieval: false },
    );
  });

  it("calibrates the evaluation prompt to the interview brief target level", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({
      difficulty: "hard",
      sessionPlan: { brief: { profile: { level: "staff-plus" } } },
    }));
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue(groqContent(JSON.stringify(V2_EVAL)));

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-1" });

    expect(result).toMatchObject({ type: "ok", fresh: true });
    expect(groqClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("Candidate Target Level: staff-plus"),
          }),
        ]),
      }),
    );
  });

  it("includes the saved whiteboard snapshot in the final evaluation payload", async () => {
    vi.mocked(getInterviewSession).mockResolvedValue(evalSession({
      id: "int-whiteboard",
      role: "Staff Engineer",
      type: "system-design",
      difficulty: "hard",
      sessionPlan: {
        whiteboardScene: {
          nodes: [{ id: "api", kind: "service", label: "API" }],
          edges: [],
        },
        whiteboardSnapshot: {
          imageBase64: "c25hcHNob3Q=",
          mimeType: "image/jpeg",
        },
      },
      transcript: [{ question: "Design a notification system.", answer: "I would begin with an API.", order: 0 }],
      evaluationClaimVersion: 0,
    }));
    vi.mocked(groqClient.chat.completions.create).mockResolvedValue(groqContent(JSON.stringify(V2_EVAL)));

    const result = await evaluateInterviewTranscript({ userId: "user-1", interviewId: "int-whiteboard" });

    expect(result).toMatchObject({ type: "ok", fresh: true });
    expect(groqClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.arrayContaining([
              expect.objectContaining({
                type: "image_url",
                image_url: { url: "data:image/jpeg;base64,c25hcHNob3Q=" },
              }),
            ]),
          }),
        ]),
      }),
    );
  });
});
