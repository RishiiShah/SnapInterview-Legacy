import { describe, expect, it, vi } from "vitest";
import {
  runProductionRetrieval,
  toPromptInterviewSession,
  type ProductionRetrievalRunner,
  type RagBenchmarkScenario,
} from "../src/lib/rag/benchmark-session";
import type { RetrievedQuestion } from "../src/lib/rag/retrieve";

const scenario: RagBenchmarkScenario = {
  id: "s1",
  title: "Full Stack Engineer",
  role: "Full Stack Engineer",
  type: "system-design",
  difficulty: "medium",
  resume: "Experienced in React and Node.",
  jobDescription: "Build distributed web apps.",
  latestAnswer: "We used Redis for caching.",
  expectedKeywords: ["redis", "cache"],
  targetCategories: ["System Design"],
};

const retrieved: RetrievedQuestion = {
  id: "q1",
  question: "How do you handle cache invalidation?",
  answer: "Cache invalidation strategies include TTL, write-through, and cache-aside.",
  category: "System Design",
  difficulty: "medium",
  similarity: 0.85,
};

describe("benchmark-session", () => {
  it("transforms scenario to prompt interview session correctly", () => {
    const session = toPromptInterviewSession(scenario);
    expect(session.id).toBe("benchmark-s1");
    expect(session.role).toBe(scenario.role);
    expect(session.type).toBe(scenario.type);
    expect(session.difficulty).toBe(scenario.difficulty);
    expect(session.resumeText).toBe(scenario.resume);
    expect(session.jobDescription).toBe(scenario.jobDescription);
    expect(session.questionCount).toBe(10);
    expect(session.currentQuestion).toBe(3);
    expect(session.transcript).toEqual([
      { question: "(previous question)", answer: scenario.latestAnswer, order: 0 },
    ]);
  });

  it("runs the production retrieval contract with a production-shaped session", async () => {
    const runner = vi.fn<ProductionRetrievalRunner>().mockResolvedValue([retrieved]);
    const result = await runProductionRetrieval(scenario, runner);

    expect(result).toEqual([retrieved]);
    expect(runner).toHaveBeenCalledWith(
      expect.objectContaining({
        role: scenario.role,
        type: scenario.type,
        resumeText: scenario.resume,
        jobDescription: scenario.jobDescription ?? null,
        transcript: [
          {
            question: "(previous question)",
            answer: scenario.latestAnswer,
            order: 0,
          },
        ],
      }),
      6
    );
  });
});
