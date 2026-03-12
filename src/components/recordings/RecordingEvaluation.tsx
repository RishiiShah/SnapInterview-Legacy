type EvaluationResult = {
    score: number;
    feedback: string;
    strengths: string[];
    areasForImprovement: string[];
};

export function RecordingEvaluation({ evaluation }: { evaluation: EvaluationResult }) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Score */}
            <div className="flex items-center gap-6">
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-8 border-zinc-100 bg-white">
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
                    <span className="text-3xl font-black text-zinc-900 tracking-tighter">
                        {evaluation.score}
                    </span>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-zinc-900">Overall Score</h3>
                    <p className="text-sm text-zinc-500 mt-1">Based on technical depth, communication, and structure.</p>
                </div>
            </div>

            {/* Feedback Summary */}
            <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-500">Feedback Summary</h3>
                <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    {evaluation.feedback}
                </p>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6">
                <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-green-600 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Key Strengths
                    </h3>
                    <ul className="space-y-2">
                        {evaluation.strengths.map((str, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-zinc-700">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span>{str}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-red-600 flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                        {evaluation.areasForImprovement.map((area, idx) => (
                            <li key={idx} className="flex gap-2 text-sm text-zinc-700">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{area}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
