import { describe, expect, it } from "vitest";
import { buildVoiceAnalysis, countFillerWords } from "./voice-analysis";

describe("voice delivery analysis", () => {
  it("counts phrase fillers once", () => {
    expect(countFillerWords("Um, you know, I mean this is basically fine." )).toBe(4);
  });

  it("shows directional coaching even when captured speech is short", () => {
    const result = buildVoiceAnalysis([{
      transcriptOrder: 0,
      speakingDurationMs: 3_000,
      responseLatencyMs: 800,
      wordsPerMinute: 130,
      pauseRatio: 0.2,
      energyVariation: 0.3,
      fillerWordCount: 0,
      audioQualityScore: 0.8,
      confidenceScore: 0.8,
    }]);

    expect(result.status).toBe("COMPLETED");
    expect(result.aggregateMetrics.assessedTurnCount).toBe(1);
    expect(result.aggregateMetrics.pace).toBe("Balanced");
  });

  it("produces bounded coaching without intent labels", () => {
    const result = buildVoiceAnalysis([{
      transcriptOrder: 0,
      speakingDurationMs: 12_000,
      responseLatencyMs: 4_200,
      wordsPerMinute: 190,
      pauseRatio: 0.05,
      energyVariation: 0.1,
      fillerWordCount: 5,
      audioQualityScore: 0.9,
      confidenceScore: 0.85,
    }]);

    expect(result.status).toBe("COMPLETED");
    expect(result.aggregateMetrics.pace).toBe("Fast");
    expect(result.aggregateMetrics.vocalVariation).toBe("Low");
    expect(result.aggregateMetrics.readingLikeSignal).toBe("Not assessed");
    expect(result.coachingSummary).not.toMatch(/cheat|dishonest|lying|deceptive|copied/i);
  });
});
