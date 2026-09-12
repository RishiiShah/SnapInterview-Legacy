import type { VoiceAnalysisView } from "@/lib/interview/voice-analysis";

type InsightTone = "positive" | "practice" | "neutral";

type DeliveryInsight = {
  label: string;
  value: string;
  status: string;
  explanation: string;
  action: string;
  tone: InsightTone;
};

const toneStyles: Record<InsightTone, { badge: string; dot: string }> = {
  positive: {
    badge: "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300",
    dot: "bg-emerald-300",
  },
  practice: {
    badge: "border-amber-300/15 bg-amber-300/[0.07] text-amber-200",
    dot: "bg-amber-200",
  },
  neutral: {
    badge: "border-blue-400/15 bg-blue-400/[0.07] text-blue-300",
    dot: "bg-blue-300",
  },
};

function seconds(milliseconds: number | null): string {
  return milliseconds === null ? "Not enough data" : `${(milliseconds / 1000).toFixed(1)}s`;
}

function buildInsights(analysis: VoiceAnalysisView): DeliveryInsight[] {
  const metrics = analysis.aggregateMetrics;
  const estimated = (analysis.confidenceScore ?? 0) < 0.45;
  const estimatePrefix = estimated ? "Estimate · " : "";
  const paceValue = metrics.averageWordsPerMinute === null
    ? "Not enough data"
    : `${estimatePrefix}${metrics.pace} · ${metrics.averageWordsPerMinute} wpm`;
  const pauseValue = metrics.averagePauseRatio === null
    ? "Not enough data"
    : `${estimatePrefix}${metrics.pauseControl} · ${Math.round(metrics.averagePauseRatio * 100)}% pause time`;

  const pace: DeliveryInsight = metrics.pace === "Slow"
    ? {
        label: "Speaking pace",
        value: paceValue,
        status: "Practice",
        explanation: "A slower pace can make a strong answer feel less decisive.",
        action: "Outline 3 points, then answer again in 60–90 seconds without adding new detail.",
        tone: "practice",
      }
    : metrics.pace === "Fast"
      ? {
          label: "Speaking pace",
          value: paceValue,
          status: "Practice",
          explanation: "A fast pace can make important evidence harder to absorb.",
          action: "Pause for one beat after your situation, action, and result.",
          tone: "practice",
        }
      : metrics.pace === "Balanced"
        ? {
            label: "Speaking pace",
            value: paceValue,
            status: "On track",
            explanation: "Your measured pace was within the conversational practice range.",
            action: "Keep this pace and slow slightly only when stating your key result.",
            tone: "positive",
          }
        : {
            label: "Speaking pace",
            value: paceValue,
            status: "Limited data",
            explanation: "There was not enough clear speech to estimate your pace.",
            action: "Try again with your microphone closer and speak for at least 20 seconds.",
            tone: "neutral",
          };

  const pauses: DeliveryInsight = metrics.pauseControl === "Needs work"
    ? {
        label: "Pauses",
        value: pauseValue,
        status: "Practice",
        explanation: "Frequent silence can interrupt the thread of your answer.",
        action: "Use a signpost such as “The main reason is…” while moving to your next point.",
        tone: "practice",
      }
    : metrics.pauseControl === "Rushed"
      ? {
          label: "Pauses",
          value: pauseValue,
          status: "Practice",
          explanation: "Very few pauses can make ideas run together.",
          action: "Take one quiet breath whenever you move to the next part of your answer.",
          tone: "practice",
        }
      : metrics.pauseControl === "Balanced"
        ? {
            label: "Pauses",
            value: pauseValue,
            status: "On track",
            explanation: "Your speech and silence were balanced enough to separate ideas.",
            action: "Keep using short pauses before your most important point.",
            tone: "positive",
          }
        : {
            label: "Pauses",
            value: pauseValue,
            status: "Limited data",
            explanation: "Pause patterns could not be measured reliably.",
            action: "Try another answer in a quieter space to get a clearer reading.",
            tone: "neutral",
          };

  const variation: DeliveryInsight = metrics.vocalVariation === "Low"
    ? {
        label: "Vocal emphasis",
        value: "Low variation",
        status: "Practice",
        explanation: "An even cadence can hide the decisions and outcomes that matter most.",
        action: "Stress one key word in each sentence—especially actions, numbers, and results.",
        tone: "practice",
      }
    : metrics.vocalVariation === "Varied"
      ? {
          label: "Vocal emphasis",
          value: "Varied",
          status: "On track",
          explanation: "Your volume changed naturally, helping important ideas stand out.",
          action: "Keep emphasizing decisions and measurable results, not every detail.",
          tone: "positive",
        }
      : {
          label: "Vocal emphasis",
          value: "Not enough data",
          status: "Limited data",
          explanation: "The recording did not contain enough clear audio to measure variation.",
          action: "Reduce background noise and keep a consistent distance from your microphone.",
          tone: "neutral",
        };

  const fillerThreshold = Math.max(3, metrics.totalTurnCount * 2);
  const fillers: DeliveryInsight = metrics.totalFillerWords > fillerThreshold
    ? {
        label: "Filler words",
        value: `${metrics.totalFillerWords} across ${metrics.totalTurnCount} ${metrics.totalTurnCount === 1 ? "answer" : "answers"}`,
        status: "Practice",
        explanation: "Repeated fillers can make transitions sound less intentional.",
        action: "Replace “um” or “you know” with a silent one-second pause.",
        tone: "practice",
      }
    : {
        label: "Filler words",
        value: `${metrics.totalFillerWords} across ${metrics.totalTurnCount} ${metrics.totalTurnCount === 1 ? "answer" : "answers"}`,
        status: "On track",
        explanation: metrics.totalFillerWords === 0
          ? "No common filler words were found in the captured answers."
          : "Fillers were occasional and did not dominate your answers.",
        action: "Keep taking a quiet pause when you need a moment to think.",
        tone: "positive",
      };

  const latencyMs = metrics.averageResponseLatencyMs;
  const responseStart: DeliveryInsight = latencyMs === null
    ? {
        label: "Response start",
        value: "Not enough data",
        status: "Limited data",
        explanation: "The time between the question and your first words was not captured.",
        action: "Try another answer with your microphone enabled from the start.",
        tone: "neutral",
      }
    : latencyMs > 5_000
      ? {
          label: "Response start",
          value: `${estimatePrefix}${seconds(latencyMs)} average`,
          status: "Practice",
          explanation: "A long lead-in can make your opening feel uncertain.",
          action: "Take one breath, then open with your main point before adding context.",
          tone: "practice",
        }
      : {
          label: "Response start",
          value: `${estimatePrefix}${seconds(latencyMs)} average`,
          status: "On track",
          explanation: latencyMs < 1_000
            ? "You began quickly; make sure you still take enough time to choose a clear example."
            : "You took a natural amount of time to gather your thoughts.",
          action: "Keep using the first sentence to state the direction of your answer.",
          tone: "positive",
        };

  return [pace, pauses, variation, fillers, responseStart];
}

export function DeliveryInsights({ analysis }: { analysis: VoiceAnalysisView }) {
  const metrics = analysis.aggregateMetrics;
  const insights = buildInsights(analysis);
  const practiceInsights = insights.filter((insight) => insight.tone === "practice");
  const priority = practiceInsights[0];
  const breakdownInsights = priority
    ? insights.filter((insight) => insight !== priority)
    : insights;
  const lowConfidence = (analysis.confidenceScore ?? 0) < 0.45;

  return (
    <section className="border-t border-white/[0.06] pt-6" aria-labelledby="delivery-insights-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h3 id="delivery-insights-title" className="text-sm font-semibold text-[#E8ECF4]">
            Delivery coaching
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#8E97A8]">
            Turn these patterns into a stronger next take. They describe how the recording sounded—not your confidence, personality, or intent.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 font-mono text-[10px] text-blue-300">
          {metrics.assessedTurnCount} of {metrics.totalTurnCount} {metrics.totalTurnCount === 1 ? "answer" : "answers"} analyzed
        </span>
      </div>

      {lowConfidence ? (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-relaxed text-amber-100/80">
          <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200" />
          <p>
            <span className="font-semibold text-amber-100">Use these as directional.</span>{" "}
            Audio quality was low, so measurements are estimates. For a clearer reading, reduce background noise and move closer to your microphone.
          </p>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-400/[0.09] to-blue-400/[0.04] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
          {priority ? "Start here" : "What to keep"}
        </p>
        <p className="mt-2 text-sm font-semibold text-[#F2F4F8]">
          {priority ? `${priority.label}: ${priority.value}` : "Your measured delivery patterns are on track"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#B9C0CD]">
          {priority
            ? priority.explanation
            : "Keep the same conversational pace and intentional pauses in your next answer."}
        </p>
        <div className="mt-3 flex gap-2 border-t border-white/[0.07] pt-3">
          <span className="text-violet-300" aria-hidden="true">→</span>
          <p className="text-xs font-medium leading-relaxed text-[#E4E7ED]">
            {priority
              ? priority.action
              : "Practice once more from 3 brief bullet points instead of a written script."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8E97A8]">
          {priority ? "Other patterns" : "Pattern breakdown"}
        </h4>
        <p className="text-[10px] text-[#677185]">One practice step per signal</p>
      </div>

      <div className="mt-2.5 grid gap-2.5">
        {breakdownInsights.map((insight) => {
          const styles = toneStyles[insight.tone];
          return (
            <article key={insight.label} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#929BAD]">{insight.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#EDF0F5]">{insight.value}</p>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${styles.badge}`}>
                  <span aria-hidden="true" className={`h-1 w-1 rounded-full ${styles.dot}`} />
                  {insight.status}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#98A1B1]">{insight.explanation}</p>
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-xs leading-relaxed text-[#D9DEE7]">
                <span className="font-semibold text-[#AAB3C2]">Try next: </span>{insight.action}
              </p>
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-[#687286]">
        Results can be affected by accent, room noise, microphone quality, and speaking style.
      </p>
    </section>
  );
}
