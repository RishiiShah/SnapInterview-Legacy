type TranscriptEntry = {
    id: string;
    order: number;
    question: string;
    answer: string;
};

export function RecordingTranscript({ transcript }: { transcript: TranscriptEntry[] }) {
    if (!transcript.length) {
        return (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                Transcript is not available for this interview.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {transcript.map((entry, idx) => (
                <div key={entry.id} className="space-y-3">
                    {/* Question Bubble */}
                    <div className="flex justify-start">
                        <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-zinc-100 p-4 text-sm text-zinc-800">
                            <span className="block text-xs font-bold text-zinc-500 mb-1">Interviewer (Q{idx + 1})</span>
                            {entry.question}
                        </div>
                    </div>
                    {/* Answer Bubble */}
                    <div className="flex justify-end">
                        <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm text-white shadow-sm">
                            <span className="block text-xs font-semibold text-blue-200 mb-1">You</span>
                            {entry.answer}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
