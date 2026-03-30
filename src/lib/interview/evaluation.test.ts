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

  it("parses transcript evaluation response without sub-scores (older LLM output)", () => {
    const parsed = parseTranscriptEvaluationResponse(
      `{"score":71,"feedback":"Solid answer.","strengths":["Structure"],"areasForImprovement":["Examples"]}`,
    );

    expect(parsed.score).toBe(71);
    expect(parsed.communication).toBeUndefined();
    expect(parsed.technicalDepth).toBeUndefined();
    expect(parsed.clarity).toBeUndefined();
  });

  it("normalizes old DB records missing sub-score fields to non-null", () => {
    const result = normalizeTranscriptEvaluation({
      score: 65,
      feedback: "Decent.",
      strengths: ["Focus"],
      areasForImprovement: ["Depth"],
    });

    expect(result).not.toBeNull();
    expect(result?.communication).toBeUndefined();
    expect(result?.technicalDepth).toBeUndefined();
    expect(result?.clarity).toBeUndefined();
  });

  it("rejects persisted sub-scores that are out of range", () => {
    expect(
      normalizeTranscriptEvaluation({
        score: 80,
        feedback: "Good.",
        strengths: ["Clarity"],
        areasForImprovement: ["Depth"],
        communication: 150,
      }),
    ).toBeNull();
  });
});
