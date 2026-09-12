import { z } from "zod/v4";

const optionalMetric = z.number().finite().nonnegative().nullable().optional();

export const voiceTurnInputSchema = z.object({
  transcriptOrder: z.number().int().min(0).max(100),
  responseLatencyMs: optionalMetric,
  speakingDurationMs: optionalMetric,
  wordsPerMinute: optionalMetric,
  pauseRatio: z.number().finite().min(0).max(1).nullable().optional(),
  energyVariation: z.number().finite().min(0).max(2).nullable().optional(),
  fillerWordCount: z.number().int().min(0).max(1000),
  audioQualityScore: z.number().finite().min(0).max(1).nullable().optional(),
  confidenceScore: z.number().finite().min(0).max(1),
});

export type VoiceTurnInput = z.infer<typeof voiceTurnInputSchema>;

export type VoiceAggregateMetrics = {
  assessedTurnCount: number;
  totalTurnCount: number;
  averageResponseLatencyMs: number | null;
  totalSpeakingDurationMs: number;
  averageWordsPerMinute: number | null;
  averagePauseRatio: number | null;
  averageEnergyVariation: number | null;
  totalFillerWords: number;
  pace: "Slow" | "Balanced" | "Fast" | "Unavailable";
  pauseControl: "Balanced" | "Needs work" | "Rushed" | "Unavailable";
  vocalVariation: "Varied" | "Low" | "Unavailable";
  readingLikeSignal: "Not assessed";
};

export type VoiceAnalysisView = {
  status: "COMPLETED" | "INSUFFICIENT_AUDIO";
  analyzerVersion: string;
  audioQualityScore: number | null;
  confidenceScore: number | null;
  aggregateMetrics: VoiceAggregateMetrics;
  coachingSummary: string;
  turns: Array<VoiceTurnInput & { transcriptOrder: number }>;
};

function average(values: Array<number | null | undefined>): number | null {
  const usable = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function rounded(value: number | null, digits = 2): number | null {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function countFillerWords(text: string): number {
  const normalized = ` ${text.toLowerCase().replace(/[^a-z'\s]/g, " ").replace(/\s+/g, " ")} `;
  const phrases = ["you know", "i mean", "sort of", "kind of"];
  let count = 0;
  let remainder = normalized;

  for (const phrase of phrases) {
    const matches = remainder.match(new RegExp(`\\b${phrase.replace(" ", "\\s+")}\\b`, "g"));
    count += matches?.length ?? 0;
    remainder = remainder.replace(new RegExp(`\\b${phrase.replace(" ", "\\s+")}\\b`, "g"), " ");
  }

  const singleFillers = remainder.match(/\b(?:um+|uh+|erm+|hmm+|basically|actually|literally)\b/g);
  return count + (singleFillers?.length ?? 0);
}

export function buildVoiceAnalysis(turns: VoiceTurnInput[]): VoiceAnalysisView {
  // Confidence is descriptive, not a product gate. Every captured answer is
  // surfaced so short, quiet, and noisy attempts still produce useful context.
  const assessedTurns = turns;
  const totalSpeakingDurationMs = assessedTurns.reduce(
    (sum, turn) => sum + (turn.speakingDurationMs ?? 0),
    0,
  );

  const averageWordsPerMinute = rounded(average(assessedTurns.map((turn) => turn.wordsPerMinute)), 0);
  const averagePauseRatio = rounded(average(assessedTurns.map((turn) => turn.pauseRatio)));
  const averageEnergyVariation = rounded(average(assessedTurns.map((turn) => turn.energyVariation)));
  const averageResponseLatencyMs = rounded(average(assessedTurns.map((turn) => turn.responseLatencyMs)), 0);
  const audioQualityScore = rounded(average(turns.map((turn) => turn.audioQualityScore)));
  const confidenceScore = rounded(average(turns.map((turn) => turn.confidenceScore)));

  const pace = averageWordsPerMinute === null
    ? "Unavailable"
    : averageWordsPerMinute < 100
      ? "Slow"
      : averageWordsPerMinute > 180
        ? "Fast"
        : "Balanced";
  const pauseControl = averagePauseRatio === null
    ? "Unavailable"
    : averagePauseRatio > 0.38
      ? "Needs work"
      : averagePauseRatio < 0.08
        ? "Rushed"
        : "Balanced";
  const vocalVariation = averageEnergyVariation === null
    ? "Unavailable"
    : averageEnergyVariation < 0.18
      ? "Low"
      : "Varied";

  const aggregateMetrics: VoiceAggregateMetrics = {
    assessedTurnCount: assessedTurns.length,
    totalTurnCount: turns.length,
    averageResponseLatencyMs,
    totalSpeakingDurationMs,
    averageWordsPerMinute,
    averagePauseRatio,
    averageEnergyVariation,
    totalFillerWords: turns.reduce((sum, turn) => sum + turn.fillerWordCount, 0),
    pace,
    pauseControl,
    vocalVariation,
    readingLikeSignal: "Not assessed",
  };

  const coaching: string[] = [];
  if (pace === "Fast") coaching.push("Slow down slightly and leave a beat between major ideas.");
  if (pace === "Slow") coaching.push("Use a concise outline before answering to keep your response moving.");
  if (pauseControl === "Needs work") coaching.push("Replace long mid-answer pauses with a brief signpost about what you are considering.");
  if (pauseControl === "Rushed") coaching.push("Add short pauses at transitions so key points have room to land.");
  if (vocalVariation === "Low") coaching.push("Emphasize decisions and trade-offs instead of keeping the same cadence throughout.");
  if (aggregateMetrics.totalFillerWords > Math.max(3, turns.length * 2)) {
    coaching.push("Practice a silent pause in place of filler words when organizing your next thought.");
  }
  if (averageWordsPerMinute === null || averagePauseRatio === null || averageEnergyVariation === null) {
    coaching.push("Some microphone measurements were limited, so use the available timing and transcript-based observations as directional coaching.");
  }
  if (!coaching.length) coaching.push("Your measured pace and pause pattern were balanced. Keep practicing conversational delivery from brief notes.");

  return {
    status: "COMPLETED",
    analyzerVersion: "browser-v1",
    audioQualityScore,
    confidenceScore,
    aggregateMetrics,
    coachingSummary: coaching.slice(0, 3).join(" "),
    turns,
  };
}
