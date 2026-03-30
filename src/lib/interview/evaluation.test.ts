import { describe, expect, it } from "vitest";
import {
  normalizeTranscriptEvaluation,
  parseQuestionEvaluationResponse,
  parseTranscriptEvaluationResponse,
} from "./evaluation";

describe("interview evaluation helpers", () => {
  it("extracts transcript evaluation JSON from fenced markdown", () => {
    const parsed = parseTranscriptEvaluationResponse(
      "```json\n{\"score\":84,\"feedback\":\"Good work.\",\"strengths\":[\"Clarity\"],\"areasForImprovement\":[\"Depth\"],\"communication\":80,\"technicalDepth\":75,\"clarity\":88}\n```",
    );

    expect(parsed).toEqual({
      score: 84,
      feedback: "Good work.",
      strengths: ["Clarity"],
      areasForImprovement: ["Depth"],
      communication: 80,
      technicalDepth: 75,
      clarity: 88,
    });
  });

  it("extracts practice evaluation JSON from mixed model output", () => {
    const parsed = parseQuestionEvaluationResponse(
      "Here is the result: {\"score\":73,\"feedback\":\"Add more specifics.\"}",
    );

    expect(parsed).toEqual({
      score: 73,
      feedback: "Add more specifics.",
    });
  });

  it("rejects invalid persisted transcript evaluations", () => {
    expect(normalizeTranscriptEvaluation({ score: "92" })).toBeNull();
  });
});
