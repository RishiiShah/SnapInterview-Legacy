"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { findActiveReplayTurn, formatReplayTime, type InterviewReplayTurnView } from "@/lib/interview/replay";

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
  replayTurns?: InterviewReplayTurnView[];
  currentTimeMs?: number;
  onSeek?: (timeMs: number) => void;
};

export function RecordingTranscript({
  transcript,
  interviewId,
  feedback,
  replayTurns = [],
  currentTimeMs = 0,
  onSeek,
}: Props) {
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
  const [followPlayback, setFollowPlayback] = useState(true);
  const turnNodesRef = useRef(new Map<number, HTMLDivElement>());
  const replayByOrder = useMemo(
    () => new Map(replayTurns.map((turn) => [turn.transcriptOrder, turn])),
    [replayTurns],
  );
  const activeOrder = useMemo(
    () => findActiveReplayTurn(replayTurns, currentTimeMs),
    [currentTimeMs, replayTurns],
  );

  useEffect(() => {
    if (!followPlayback || activeOrder === null) return;
    turnNodesRef.current.get(activeOrder)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeOrder, followPlayback]);

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
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-500"
      onWheel={() => setFollowPlayback(false)}
      onTouchMove={() => setFollowPlayback(false)}
    >
      {replayTurns.length ? (
        <div className="sticky top-0 z-10 mb-2 flex items-center justify-between border-b border-white/[0.06] bg-[#0C0F1A]/95 pb-3 backdrop-blur">
          <div>
            <p className="text-xs font-medium text-[#E8ECF4]">Interactive replay</p>
            <p className="mt-0.5 text-[10px] text-[#7F889A]">Playback and transcript stay synchronized</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFollowPlayback(true);
              if (activeOrder !== null) {
                turnNodesRef.current.get(activeOrder)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
            aria-pressed={followPlayback}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
              followPlayback
                ? "border-blue-400/30 bg-blue-400/10 text-blue-300"
                : "border-white/[0.1] text-[#A8B0C2] hover:text-white"
            }`}
          >
            {followPlayback ? "Following playback" : "Resume following"}
          </button>
        </div>
      ) : (
        <p className="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] text-[#8B93A7]">
          This recording predates synchronized replay. New interviews will include clickable timestamps.
        </p>
      )}
      <div className="divide-y divide-white/[0.05]">
      {transcript.map((entry, idx) => {
        const currentRating = ratings[entry.order];
        const isSubmitting = submitting[entry.order];
        const replay = replayByOrder.get(entry.order);
        const isActive = activeOrder === entry.order;
        return (
          <div
            key={entry.id}
            ref={(node) => {
              if (node) turnNodesRef.current.set(entry.order, node);
              else turnNodesRef.current.delete(entry.order);
            }}
            aria-current={isActive ? "true" : undefined}
            className={`space-y-3 border-l-2 py-5 pl-3 pr-1 transition-colors first:pt-3 last:pb-3 ${
              isActive ? "border-blue-400 bg-blue-400/[0.06]" : "border-transparent"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[11px] tabular-nums text-[#6B7385]">Q{idx + 1}</p>
                  {replay?.questionStartMs !== null && replay?.questionStartMs !== undefined ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFollowPlayback(true);
                        onSeek?.(replay.questionStartMs!);
                      }}
                      className="cursor-pointer font-mono text-[10px] tabular-nums text-blue-300 hover:text-blue-200"
                      aria-label={`Play question ${idx + 1} from ${formatReplayTime(replay.questionStartMs)}`}
                    >
                      {formatReplayTime(replay.questionStartMs)}
                    </button>
                  ) : null}
                </div>
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
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-[#6B7385]">You</p>
                {replay?.answerStartMs !== null && replay?.answerStartMs !== undefined ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFollowPlayback(true);
                      onSeek?.(Math.max(0, replay.answerStartMs! - 750));
                    }}
                    className="cursor-pointer font-mono text-[10px] tabular-nums text-blue-300 hover:text-blue-200"
                    aria-label={`Play answer ${idx + 1} from ${formatReplayTime(replay.answerStartMs)}`}
                  >
                    {formatReplayTime(replay.answerStartMs)}
                  </button>
                ) : null}
                {isActive ? <span className="text-[9px] uppercase tracking-wider text-blue-300">Playing</span> : null}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#C5CBD8]">{entry.answer}</p>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
