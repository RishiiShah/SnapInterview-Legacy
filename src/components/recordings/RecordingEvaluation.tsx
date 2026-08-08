type EvaluationResult = {
  score: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
  communication?: number;
  technicalDepth?: number;
  clarity?: number;
};

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 70) return "text-amber-300";
  return "text-rose-300";
}

export function RecordingEvaluation({ evaluation }: { evaluation: EvaluationResult }) {
  const instruments = [
    { label: "Communication", value: evaluation.communication },
    { label: "Technical", value: evaluation.technicalDepth },
    { label: "Clarity", value: evaluation.clarity },
  ].filter((item): item is { label: string; value: number } => item.value != null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Scoreboard hero */}
      <div>
        <p className="text-[12px] text-[#B8C0CE]">Overall score</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className={`font-mono text-5xl font-medium tracking-tight ${scoreTone(evaluation.score)}`}>
            {evaluation.score}
          </span>
          <span className="font-mono text-lg font-medium text-[#B8C0CE]">/100</span>
        </div>
        <p className="mt-2 text-sm text-[#A8B0C2]">
          Technical depth, communication, and structure.
        </p>
      </div>

      {instruments.length > 0 ? (
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

      <div className="border-t border-white/[0.06] pt-6">
        <p className="text-[12px] text-[#B8C0CE]">Feedback</p>
        <p className="mt-2 text-sm leading-relaxed text-[#E8ECF4]">{evaluation.feedback}</p>
      </div>

      <div className="grid gap-8 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
        <div>
          <p className="text-[12px] text-[#A8B0C2]">Keep leaning on</p>
          <ul className="mt-3 space-y-2.5">
            {evaluation.strengths.map((str, idx) => (
              <li key={idx} className="text-sm leading-snug text-[#E8ECF4]">
                {str}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[12px] text-[#A8B0C2]">Focus next</p>
          <ul className="mt-3 space-y-2.5">
            {evaluation.areasForImprovement.map((area, idx) => (
              <li key={idx} className="text-sm leading-snug text-[#E8ECF4]">
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
