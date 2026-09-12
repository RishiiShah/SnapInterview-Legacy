// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeliveryInsights } from "./DeliveryInsights";
import { buildVoiceAnalysis } from "@/lib/interview/voice-analysis";

describe("DeliveryInsights", () => {
  it("shows safe coaching metrics without a pass/fail or intent classification", () => {
    const analysis = buildVoiceAnalysis([{
      transcriptOrder: 0,
      responseLatencyMs: 4_200,
      speakingDurationMs: 12_000,
      wordsPerMinute: 130,
      pauseRatio: 0.2,
      energyVariation: 0.25,
      fillerWordCount: 2,
      audioQualityScore: 0.9,
      confidenceScore: 0.85,
    }]);

    render(<DeliveryInsights analysis={analysis} />);

    expect(screen.getByText("Delivery coaching")).toBeTruthy();
    expect(screen.getByText("4.2s average")).toBeTruthy();
    expect(screen.getByText("What to keep")).toBeTruthy();
    expect(screen.getByText("Balanced · 130 wpm")).toBeTruthy();
    expect(screen.getAllByText(/Try next:/)).toHaveLength(5);
    expect(screen.getByText(/Results can be affected by accent/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/cheating|dishonest|lying|deceptive|copied/i);
  });

  it("puts the highest-priority coaching before the metric breakdown", () => {
    const analysis = buildVoiceAnalysis([{
      transcriptOrder: 0,
      responseLatencyMs: 6_200,
      speakingDurationMs: 20_000,
      wordsPerMinute: 82,
      pauseRatio: 0.45,
      energyVariation: 0.1,
      fillerWordCount: 5,
      audioQualityScore: 0.4,
      confidenceScore: 0.4,
    }]);

    render(<DeliveryInsights analysis={analysis} />);

    expect(screen.getByText("Speaking pace: Estimate · Slow · 82 wpm")).toBeTruthy();
    expect(screen.getByText(/Audio quality was low/)).toBeTruthy();
    expect(screen.getAllByText("Practice")).toHaveLength(4);
    expect(screen.getAllByText(/Outline 3 points/)).toHaveLength(1);
  });
});
