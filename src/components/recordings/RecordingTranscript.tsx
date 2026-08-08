"use client";

import { useState } from "react";

type TranscriptEntry = {
  id: string;
  order: number;
  question: string;
  answer: string;
};

type FeedbackEntry = {
  questionOrder: number;
  rating: string;
};

type Props = {
  transcript: TranscriptEntry[];
  interviewId: string;
  feedback: FeedbackEntry[];
};

export function RecordingTranscript({ transcript, interviewId, feedback }: Props) {
  const [ratings, setRatings] = useState<Record<number, "up" | "down">>(() => {
    const map: Record<number, "up" | "down"> = {};
    for (const f of feedback) {
      if (f.rating === "up" || f.rating === "down") {
        map[f.questionOrder] = f.rating;
      }
    }
    return map;
  });
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  if (!transcript.length) {
    return <p className="py-4 text-sm text-[#A8B0C2]">Transcript is not available for this interview.</p>;
  }

  async function rate(order: number, rating: "up" | "down") {
    if (submitting[order]) return;
    const previous = ratings[order];
    setRatings((r) => ({ ...r, [order]: rating }));
    setSubmitting((s) => ({ ...s, [order]: true }));
    try {
      await fetch(`/api/interview/${interviewId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionOrder: order, rating }),
      });
    } catch {
      setRatings((r) => {
        const next = { ...r };
        if (previous === undefined) delete next[order];
        else next[order] = previous;
        return next;
      });
    } finally {
      setSubmitting((s) => ({ ...s, [order]: false }));
    }
  }

  return (
    <div className="divide-y divide-white/[0.05] animate-in fade-in slide-in-from-bottom-2 duration-500">
      {transcript.map((entry, idx) => {
        const currentRating = ratings[entry.order];
        const isSubmitting = submitting[entry.order];
        return (
          <div key={entry.id} className="space-y-3 py-5 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] tabular-nums text-[#6B7385]">Q{idx + 1}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[#E8ECF4]">{entry.question}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => void rate(entry.order, "up")}
                  disabled={isSubmitting}
                  aria-label="Thumbs up"
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                    currentRating === "up"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-[#A8B0C2] hover:bg-white/[0.04] hover:text-emerald-400"
                  } disabled:opacity-50`}
                >
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => void rate(entry.order, "down")}
                  disabled={isSubmitting}
                  aria-label="Thumbs down"
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
                    currentRating === "down"
                      ? "bg-rose-500/15 text-rose-300"
                      : "text-[#A8B0C2] hover:bg-white/[0.04] hover:text-rose-300"
                  } disabled:opacity-50`}
                >
                  <svg className="h-3.5 w-3.5 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-[#6B7385]">You</p>
              <p className="mt-1 text-sm leading-relaxed text-[#C5CBD8]">{entry.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
