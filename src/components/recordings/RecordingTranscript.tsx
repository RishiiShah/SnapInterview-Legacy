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
        return (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                Transcript is not available for this interview.
            </div>
        );
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {transcript.map((entry, idx) => {
                const currentRating = ratings[entry.order];
                const isSubmitting = submitting[entry.order];
                return (
                    <div key={entry.id} className="space-y-3">
                        {/* Question Bubble */}
                        <div className="flex justify-start gap-2">
                            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-zinc-100 p-4 text-sm text-zinc-800">
                                <span className="block text-xs font-bold text-zinc-600 mb-1">Interviewer (Q{idx + 1})</span>
                                {entry.question}
                            </div>
                            {/* Feedback buttons */}
                            <div className="flex flex-col gap-1 justify-center shrink-0">
                                <button
                                    onClick={() => void rate(entry.order, "up")}
                                    disabled={isSubmitting}
                                    aria-label="Thumbs up"
                                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                                        currentRating === "up"
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:border-emerald-400 hover:text-emerald-500"
                                    } disabled:opacity-50`}
                                >
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => void rate(entry.order, "down")}
                                    disabled={isSubmitting}
                                    aria-label="Thumbs down"
                                    className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                                        currentRating === "down"
                                            ? "border-red-400 bg-red-50 text-red-500"
                                            : "border-zinc-200 bg-white text-zinc-600 hover:border-red-300 hover:text-red-400"
                                    } disabled:opacity-50`}
                                >
                                    <svg className="h-3.5 w-3.5 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                </button>
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
                );
            })}
        </div>
    );
}
