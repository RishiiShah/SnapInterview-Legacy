import type { VoiceAnalysisView } from "@/lib/interview/voice-analysis";

function seconds(milliseconds: number | null): string {
  return milliseconds === null ? "Unavailable" : `${(milliseconds / 1000).toFixed(1)}s average`;
}

function percentage(value: number | null): string {
  return value === null ? "Unavailable" : `${Math.round(value * 100)}%`;
}

export function DeliveryInsights({ analysis }: { analysis: VoiceAnalysisView }) {
  const metrics = analysis.aggregateMetrics;
  const rows = [
    { label: "Pace", value: metrics.pace },
    { label: "Pause control", value: metrics.pauseControl },
    { label: "Vocal variation", value: metrics.vocalVariation },
    { label: "Answer response time", value: seconds(metrics.averageResponseLatencyMs) },
    {
      label: "Filler words",
      value: `${metrics.totalFillerWords} across ${metrics.totalTurnCount} ${metrics.totalTurnCount === 1 ? "answer" : "answers"}`,
    },
    { label: "Reading-like delivery", value: metrics.readingLikeSignal },
    { label: "Audio confidence", value: percentage(analysis.confidenceScore) },
  ];

  return (
    <section className="border-t border-white/[0.06] pt-6" aria-labelledby="delivery-insights-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="delivery-insights-title" className="text-[12px] font-medium text-[#B8C0CE]">
            Delivery Insights
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-[#7F889A]">
            Private coaching from browser-measured delivery patterns. This does not assess intent, honesty, or emotion.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-1 font-mono text-[10px] text-blue-300">
          {metrics.assessedTurnCount}/{metrics.totalTurnCount} assessed
        </span>
      </div>

      <dl className="mt-4 divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-white/[0.02] px-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 text-xs">
            <dt className="text-[#929BAD]">{row.label}</dt>
            <dd className="text-right font-medium text-[#E8ECF4]">{row.value}</dd>
          </div>
        ))}
      </dl>
      {(analysis.confidenceScore ?? 0) < 0.45 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-200/75">
          Microphone confidence was low. These measurements are still shown, but treat them as directional.
        </p>
      ) : null}
      <div className="mt-4 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] p-3.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-300">Coaching</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[#D7DCE6]">{analysis.coachingSummary}</p>
      </div>
    </section>
  );
}
