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

    expect(screen.getByText("Delivery Insights")).toBeTruthy();
    expect(screen.getByText("4.2s average")).toBeTruthy();
    expect(screen.getByText("Not assessed")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/cheating|dishonest|lying|deceptive|copied/i);
  });
});
