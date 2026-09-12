import { describe, expect, it } from "vitest";
import {
  buildWaveformPeaks,
  findActiveReplayTurn,
  formatReplayTime,
  replayTimingInputSchema,
} from "./replay";

const turns = [
  { transcriptOrder: 0, questionStartMs: 1_000, questionEndMs: 3_000, answerStartMs: 4_000, answerEndMs: 9_000, timingSource: "browser-v1", confidenceScore: 0.9 },
  { transcriptOrder: 1, questionStartMs: 10_000, questionEndMs: 12_000, answerStartMs: 13_000, answerEndMs: 20_000, timingSource: "browser-v1", confidenceScore: 0.9 },
];

describe("interview replay", () => {
  it("finds the transcript turn for the playback clock", () => {
    expect(findActiveReplayTurn(turns, 6_000)).toBe(0);
    expect(findActiveReplayTurn(turns, 15_000)).toBe(1);
    expect(findActiveReplayTurn(turns, 500)).toBeNull();
  });

  it("formats session-relative timestamps", () => {
    expect(formatReplayTime(125_000)).toBe("2:05");
  });

  it("rejects replay writes without a timestamp", () => {
    expect(replayTimingInputSchema.safeParse({ transcriptOrder: 0 }).success).toBe(false);
  });

  it("creates normalized waveform bars from every channel", () => {
    const peaks = buildWaveformPeaks([
      new Float32Array([0, 0.25, 0.5, 1]),
      new Float32Array([0, 0.25, 0.5, 1]),
    ], 2);

    expect(peaks).toHaveLength(2);
    expect(peaks[1]).toBe(1);
    expect(peaks[0]).toBeGreaterThan(0);
    expect(peaks[0]).toBeLessThan(peaks[1]);
  });

  it("keeps silent waveform bars at zero", () => {
    expect(buildWaveformPeaks([new Float32Array(20)], 4)).toEqual([0, 0, 0, 0]);
  });
});
