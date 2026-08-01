type EvaluationResult = {
    score: number;
    feedback: string;
    strengths: string[];
    areasForImprovement: string[];
    communication?: number;
    technicalDepth?: number;
    clarity?: number;
};

export function RecordingEvaluation({ evaluation }: { evaluation: EvaluationResult }) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Score */}
            <div className="flex items-center gap-6">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-white/[0.06] bg-white/[0.02]">
                    <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        <circle
                            cx="50"
                            cy="50"
                            r="46"
                            fill="transparent"
                            stroke={evaluation.score >= 80 ? "#16a34a" : evaluation.score >= 60 ? "#ca8a04" : "#dc2626"}
                            strokeWidth="8"
                            strokeDasharray="289.026"
                            strokeDashoffset={289.026 - (289.026 * evaluation.score) / 100}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <span className="text-3xl font-black text-[#F2F4F8] tracking-tighter">
                        {evaluation.score}
                    </span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[#F2F4F8]">Overall Score</h3>
                    <p className="text-sm text-[#A8B0C2] mt-1">Based on technical depth, communication, and structure.</p>
                </div>
            </div>

            {/* Sub-score Breakdown */}
            {(evaluation.communication != null || evaluation.technicalDepth != null || evaluation.clarity != null) && (
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { label: "Communication", value: evaluation.communication, bar: "bg-[#3B82F6]" },
                        { label: "Technical", value: evaluation.technicalDepth, bar: "bg-violet-400" },
                        { label: "Clarity", value: evaluation.clarity, bar: "bg-emerald-400" },
                    ].map(({ label, value, bar }) => (
                        <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                            <p className="text-[10px] font-medium text-[#A8B0C2] mb-1">{label}</p>
                            {value != null ? (
                                <>
                                    <p className="text-xl font-bold tracking-tight text-[#F2F4F8] leading-none mb-2">{value}</p>
                                    <div className="h-1.5 w-full rounded-full bg-white/[0.08]">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${bar}`}
                                            style={{ width: `${value}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-[#A8B0C2] italic">—</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Feedback Summary */}
            <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#A8B0C2]">Feedback Summary</h3>
                <p className="text-sm text-[#E8ECF4] leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/[0.08]">
                    {evaluation.feedback}
                </p>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6">
                <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Key Strengths
                    </h3>
                    <ul className="space-y-2">
                        {evaluation.strengths.map((str, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-[#E8ECF4]">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                <span>{str}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                        {evaluation.areasForImprovement.map((area, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-[#E8ECF4]">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>{area}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
