import { describe, expect, it } from "vitest";
import {
  getScorecardDimensionsForType,
  normalizeTranscriptEvaluation,
  parseQuestionEvaluationResponse,
  parseTranscriptEvaluationResponse,
} from "./evaluation";

describe("interview evaluation helpers", () => {
  it("returns type-specific scorecard dimensions for system-design", () => {
    const dims = getScorecardDimensionsForType("system-design");
    const keys = dims.map((d) => d.key);
    expect(keys).toContain("problemFraming");
    expect(keys).toContain("structuredCommunication");
    expect(keys).toContain("depthUnderFollowups");
    expect(keys).toContain("evidenceSpecificity");
    expect(keys).toContain("roleJdFit");
    expect(keys).toContain("whiteboardClarityAndDecomposition");
    const totalWeight = dims.reduce((acc, d) => acc + d.weight, 0);
    expect(Math.round(totalWeight * 100) / 100).toBe(1.0);
  });

  it("returns type-specific scorecard dimensions for coding-algorithms", () => {
    const dims = getScorecardDimensionsForType("coding-algorithms");
    const keys = dims.map((d) => d.key);
    expect(keys).toContain("codeCorrectnessAndComplexity");
    const totalWeight = dims.reduce((acc, d) => acc + d.weight, 0);
    expect(Math.round(totalWeight * 100) / 100).toBe(1.0);
  });

  it("returns type-specific scorecard dimensions for behavioral-leadership", () => {
    const dims = getScorecardDimensionsForType("behavioral-leadership");
    const keys = dims.map((d) => d.key);
    expect(keys).toContain("ownershipAndLeadership");
    const totalWeight = dims.reduce((acc, d) => acc + d.weight, 0);
    expect(Math.round(totalWeight * 100) / 100).toBe(1.0);
  });

  it("parses and validates V2 Scorecard with approved dimensions and estimatedLevel vocabulary", () => {
    const v2Payload = {
      version: 2,
      overallScore: 88,
      verdict: "hire",
      estimatedLevel: "senior",
      levelRationale: "Demonstrated strong distributed systems trade-offs and idempotency patterns.",
      companySignals: { matchedCompanyPack: "Stripe", methodNotes: "Strong API design" },
      dimensions: [
        {
          key: "problemFraming",
          label: "Problem Framing & Scope Definition",
          score: 85,
          weight: 0.15,
          summary: "Clarified constraints upfront.",
          strengths: ["[Q1 Architecture]: Clarified scale and throughput."],
          growthAreas: [],
          evidenceCitations: [{ turnOrder: 1, quoteOrTopic: "50k TPS", note: "Good scale estimation" }],
        },
        {
          key: "structuredCommunication",
          label: "Structured Communication & Clarity",
          score: 90,
          weight: 0.15,
          summary: "Top-down communication.",
          strengths: [],
          growthAreas: [],
          evidenceCitations: [],
        },
        {
          key: "depthUnderFollowups",
          label: "Technical Depth Under Follow-ups",
          score: 85,
          weight: 0.20,
          summary: "Handled failure modes well.",
          strengths: [],
          growthAreas: [],
          evidenceCitations: [],
        },
        {
          key: "evidenceSpecificity",
          label: "Evidence Specificity & Concrete Claims",
          score: 90,
          weight: 0.15,
          summary: "Detailed Redis and Postgres partitioning.",
          strengths: [],
          growthAreas: [],
          evidenceCitations: [],
        },
        {
          key: "roleJdFit",
          label: "Role & Domain Competency",
          score: 88,
          weight: 0.20,
          summary: "Strong fit for backend systems.",
          strengths: [],
          growthAreas: [],
          evidenceCitations: [],
        },
        {
          key: "whiteboardClarityAndDecomposition",
          label: "Whiteboard Clarity & Architecture Decomposition",
          score: 92,
          weight: 0.15,
          summary: "Clean diagrams with clear arrows.",
          strengths: ["[Q2 Whiteboard]: Logical layout of services."],
          growthAreas: [],
          evidenceCitations: [{ turnOrder: 2, quoteOrTopic: "API -> Redis -> DB", note: "Clean architecture flow" }],
        },
      ],
      briefPillarCoverage: [{ pillarId: "pillar-1", pillarTitle: "Distributed Store", covered: true }],
      executiveSummary: "Strong senior candidate with solid architecture intuition.",
      keyStrengths: ["[Q1 Scale]: Handled high throughput."],
      criticalGaps: ["[Q3 Recovery]: Missed split-brain quorum edge case."],
      recommendedPreparation: ["Review Raft quorum edge cases."],
    };

    const parsed = parseTranscriptEvaluationResponse(JSON.stringify(v2Payload));
    expect(parsed.score).toBe(88);
    expect(parsed.v2?.verdict).toBe("hire");
    expect(parsed.v2?.estimatedLevel).toBe("senior");
    expect(parsed.v2?.dimensions.length).toBe(6);
    expect(parsed.v2?.dimensions[5].key).toBe("whiteboardClarityAndDecomposition");
  });

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
