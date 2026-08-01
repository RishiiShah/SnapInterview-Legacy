type TranscriptEntry = {
  id: string;
  order: number;
  question: string;
  answer: string;
};

export function AdminInterviewTranscript({ transcript }: { transcript: TranscriptEntry[] }) {
  if (!transcript.length) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        No transcript entries for this interview.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {transcript.map((entry, idx) => (
        <div key={entry.id} className="space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-zinc-100 p-4 text-sm text-zinc-800">
              <span className="mb-1 block text-xs font-bold text-zinc-600">
                Interviewer (Q{idx + 1})
              </span>
              <p className="whitespace-pre-wrap">{entry.question}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-blue-600 p-4 text-sm text-white shadow-sm">
              <span className="mb-1 block text-xs font-semibold text-blue-200">Candidate</span>
              <p className="whitespace-pre-wrap">{entry.answer || "—"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
