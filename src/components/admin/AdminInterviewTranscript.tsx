type TranscriptEntry = {
  id: string;
  order: number;
  question: string;
  answer: string;
};

export function AdminInterviewTranscript({ transcript }: { transcript: TranscriptEntry[] }) {
  if (!transcript.length) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-[#A8B0C2]">
        No transcript entries for this interview.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {transcript.map((entry, idx) => (
        <div key={entry.id} className="space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-[#E8ECF4]">
              <span className="mb-1 block text-xs font-bold text-[#A8B0C2]">
                Interviewer (Q{idx + 1})
              </span>
              <p className="whitespace-pre-wrap">{entry.question}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-[#3B82F6] p-4 text-sm text-white">
              <span className="mb-1 block text-xs font-semibold text-blue-100">Candidate</span>
              <p className="whitespace-pre-wrap">{entry.answer || "—"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
