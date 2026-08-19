import type { TranscriptEvaluationResponse, TranscriptEvaluationV2 } from "@/lib/interview/evaluation";

function scoreTone(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-amber-300";
  return "text-rose-400";
}

function verdictTone(verdict: string): { bg: string; text: string; label: string } {
  switch (verdict) {
    case "strong_hire":
      return { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400", label: "Strong Hire" };
    case "hire":
      return { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-300", label: "Hire" };
    case "lean_hire":
      return { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-300", label: "Lean Hire" };
    case "lean_no_hire":
      return { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-300", label: "Lean No Hire" };
    case "no_hire":
    default:
      return { bg: "bg-rose-500/15 border-rose-500/30", text: "text-rose-400", label: "No Hire" };
  }
}

function formatEstimatedLevel(level: string): string {
  switch (level) {
    case "entry-level":
      return "Entry-Level (L3 / Junior)";
    case "mid-level":
      return "Mid-Level (L4)";
    case "senior":
      return "Senior (L5)";
    case "staff-plus":
      return "Staff+ (L6+)";
    case "not-levelable":
      return "Not Levelable";
    default:
      return level;
  }
}

export function RecordingEvaluation({ evaluation }: { evaluation: TranscriptEvaluationResponse }) {
  const v2: TranscriptEvaluationV2 | undefined = evaluation.v2;

  const instruments = [
    { label: "Communication", value: evaluation.communication },
    { label: "Technical Depth", value: evaluation.technicalDepth },
    { label: "Problem Solving", value: evaluation.clarity },
  ].filter((item): item is { label: string; value: number } => item.value != null);

  const verdictMeta = v2 ? verdictTone(v2.verdict) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Scoreboard hero */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] text-[#B8C0CE]">Overall score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`font-mono text-5xl font-medium tracking-tight ${scoreTone(evaluation.score)}`}>
              {evaluation.score}
            </span>
            <span className="font-mono text-lg font-medium text-[#B8C0CE]">/100</span>
          </div>
          {v2 ? (
            <p className="mt-1 text-xs text-[#8B93A7]">
              Calibrated Level: <span className="font-medium text-slate-200">{formatEstimatedLevel(v2.estimatedLevel)}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-[#A8B0C2]">
              Technical depth, communication, and problem-solving structure.
            </p>
          )}
        </div>

        {verdictMeta && (
          <div className={`rounded-xl border px-4 py-2.5 text-right ${verdictMeta.bg}`}>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Hiring Bar Verdict
            </span>
            <span className={`font-mono text-base font-semibold ${verdictMeta.text}`}>
              {verdictMeta.label}
            </span>
          </div>
        )}
      </div>

      {/* Level Rationale if present in V2 */}
      {v2?.levelRationale && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Level Calibration Rationale</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{v2.levelRationale}</p>
        </div>
      )}

      {/* Scorecard Dimensions (V2) or Legacy Instruments */}
      {v2 && Array.isArray(v2.dimensions) && v2.dimensions.length > 0 ? (
        <div className="space-y-4 border-t border-white/[0.06] pt-6">
          <p className="text-[12px] font-medium text-[#B8C0CE]">Evaluation Dimensions</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {v2.dimensions.map((dim) => (
              <div key={dim.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{dim.label}</span>
                  <span className={`font-mono text-sm font-semibold tabular-nums ${scoreTone(dim.score)}`}>
                    {dim.score} / 100
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-1.5 rounded-full bg-[#3B82F6] transition-all duration-500"
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-[#A8B0C2]">{dim.summary}</p>
                {dim.evidenceCitations && dim.evidenceCitations.length > 0 && (
                  <div className="pt-1 border-t border-white/[0.04]">
                    <span className="text-[10px] text-slate-400">Evidence: </span>
                    <span className="text-[11px] text-slate-300">
                      {dim.evidenceCitations[0].quoteOrTopic} ({dim.evidenceCitations[0].note})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {v2.briefPillarCoverage && v2.briefPillarCoverage.length > 0 && (
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Planned Agenda Topics Covered</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {v2.briefPillarCoverage.map((pillar) => (
                  <div key={pillar.pillarId} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${pillar.covered ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                      {pillar.covered ? "✓" : "–"}
                    </span>
                    <div>
                      <span className="font-medium text-slate-200">{pillar.pillarTitle}</span>
                      {pillar.notes && <p className="text-[10px] text-slate-400">{pillar.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : instruments.length > 0 ? (
        <dl className="grid grid-cols-3 gap-x-6 border-t border-white/[0.06] pt-6">
          {instruments.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[11px] text-[#B8C0CE]">{label}</dt>
              <dd className={`mt-1 font-mono text-xl font-medium tabular-nums ${scoreTone(value)}`}>
                {value}
              </dd>
              <div className="mt-2 h-px w-full bg-white/[0.06]">
                <div
                  className="h-px bg-[#3B82F6]/75 transition-all duration-500"
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      ) : null}

      {/* Executive Feedback Summary */}
      <div className="border-t border-white/[0.06] pt-6">
        <p className="text-[12px] text-[#B8C0CE]">Executive Feedback</p>
        <p className="mt-2 text-sm leading-relaxed text-[#E8ECF4] whitespace-pre-line">{evaluation.feedback}</p>
      </div>

      {/* Strengths & Improvement Areas */}
      <div className="grid gap-8 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
        <div>
          <p className="text-[12px] font-medium text-emerald-400">Key Strengths & Decisions</p>
          <ul className="mt-3 space-y-2.5">
            {evaluation.strengths.map((str, idx) => (
              <li key={idx} className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-2.5 text-xs leading-relaxed text-[#E8ECF4]">
                {str}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[12px] font-medium text-amber-400">Critical Gaps & Recommended Fixes</p>
          <ul className="mt-3 space-y-2.5">
            {evaluation.areasForImprovement.map((area, idx) => (
              <li key={idx} className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-2.5 text-xs leading-relaxed text-[#E8ECF4]">
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Prep Steps (V2) */}
      {v2 && Array.isArray(v2.recommendedPreparation) && v2.recommendedPreparation.length > 0 && (
        <div className="border-t border-white/[0.06] pt-6">
          <p className="text-[12px] font-medium text-[#B8C0CE]">High-Leverage Next Prep Steps</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {v2.recommendedPreparation.map((step, idx) => (
              <div key={idx} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs text-slate-300">
                <span className="font-mono text-blue-400 mr-1.5">{idx + 1}.</span> {step}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
