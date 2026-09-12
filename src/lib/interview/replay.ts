import { z } from "zod/v4";

const replayMsSchema = z.number().int().min(0).max(24 * 60 * 60 * 1000);

export const replayTimingInputSchema = z.object({
  transcriptOrder: z.number().int().min(0).max(100),
  questionStartMs: replayMsSchema.optional(),
  questionEndMs: replayMsSchema.optional(),
  answerStartMs: replayMsSchema.optional(),
  answerEndMs: replayMsSchema.optional(),
  confidenceScore: z.number().finite().min(0).max(1).optional(),
}).refine(
  (value) => [value.questionStartMs, value.questionEndMs, value.answerStartMs, value.answerEndMs]
    .some((timestamp) => timestamp !== undefined),
  "At least one replay timestamp is required",
);

export type ReplayTimingInput = z.infer<typeof replayTimingInputSchema>;

export type InterviewReplayTurnView = {
  transcriptOrder: number;
  questionStartMs: number | null;
  questionEndMs: number | null;
  answerStartMs: number | null;
  answerEndMs: number | null;
  timingSource: string;
  confidenceScore: number;
};

export function formatReplayTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function findActiveReplayTurn(
  turns: InterviewReplayTurnView[],
  currentTimeMs: number,
): number | null {
  let active: number | null = null;
  for (const turn of turns) {
    const start = turn.questionStartMs ?? turn.answerStartMs;
    if (start === null || start > currentTimeMs) continue;
    const end = turn.answerEndMs ?? turn.questionEndMs;
    active = turn.transcriptOrder;
    if (end !== null && currentTimeMs <= end) break;
  }
  return active;
}

export function buildWaveformPeaks(
  channels: Float32Array[],
  barCount: number,
): number[] {
  if (!channels.length || barCount <= 0) return [];
  const sampleCount = Math.max(...channels.map((channel) => channel.length));
  if (!sampleCount) return Array.from({ length: barCount }, () => 0);

  const peaks = Array.from({ length: barCount }, (_, barIndex) => {
    const start = Math.floor((barIndex / barCount) * sampleCount);
    const end = Math.max(start + 1, Math.floor(((barIndex + 1) / barCount) * sampleCount));
    let squareTotal = 0;
    let valuesRead = 0;

    for (const channel of channels) {
      const channelEnd = Math.min(end, channel.length);
      // Sample across the entire recording without doing unbounded work on long files.
      const stride = Math.max(1, Math.floor((channelEnd - start) / 256));
      for (let sampleIndex = start; sampleIndex < channelEnd; sampleIndex += stride) {
        const sample = channel[sampleIndex] ?? 0;
        squareTotal += sample * sample;
        valuesRead += 1;
      }
    }

    return valuesRead ? Math.sqrt(squareTotal / valuesRead) : 0;
  });

  const maxPeak = Math.max(...peaks);
  if (maxPeak <= 0) return peaks;
  return peaks.map((peak) => Math.min(1, peak / maxPeak));
}
