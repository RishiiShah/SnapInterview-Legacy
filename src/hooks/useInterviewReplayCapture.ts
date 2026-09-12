"use client";

import { useCallback, useRef } from "react";
import type { ReplayTimingInput } from "@/lib/interview/replay";

export function useInterviewReplayCapture({
  interviewId,
  getRecordingElapsedMs,
}: {
  interviewId: string;
  getRecordingElapsedMs: () => number | null;
}) {
  const questionEndByOrderRef = useRef(new Map<number, number>());
  const answerStartedOrdersRef = useRef(new Set<number>());

  const persist = useCallback((payload: ReplayTimingInput) => {
    void fetch(`/api/interview/${encodeURIComponent(interviewId)}/replay-timing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Replay metadata must never interrupt the live interview.
    });
  }, [interviewId]);

  const markQuestionStarted = useCallback((transcriptOrder: number) => {
    const timestamp = getRecordingElapsedMs();
    if (timestamp === null) return;
    persist({ transcriptOrder, questionStartMs: timestamp, confidenceScore: 0.9 });
  }, [getRecordingElapsedMs, persist]);

  const markQuestionCompleted = useCallback((transcriptOrder: number) => {
    const timestamp = getRecordingElapsedMs();
    if (timestamp === null) return;
    questionEndByOrderRef.current.set(transcriptOrder, timestamp);
    persist({ transcriptOrder, questionEndMs: timestamp, confidenceScore: 0.9 });
  }, [getRecordingElapsedMs, persist]);

  const markAnswerStarted = useCallback((transcriptOrder: number) => {
    if (answerStartedOrdersRef.current.has(transcriptOrder)) return;
    const timestamp = getRecordingElapsedMs();
    if (timestamp === null) return;
    answerStartedOrdersRef.current.add(transcriptOrder);
    persist({ transcriptOrder, answerStartMs: timestamp, confidenceScore: 0.9 });
  }, [getRecordingElapsedMs, persist]);

  const markAnswerSubmitted = useCallback((_answer: string, transcriptOrder: number) => {
    const timestamp = getRecordingElapsedMs();
    if (timestamp === null) return;
    const fallbackStart = questionEndByOrderRef.current.get(transcriptOrder);
    const hasDetectedStart = answerStartedOrdersRef.current.has(transcriptOrder);
    persist({
      transcriptOrder,
      ...(!hasDetectedStart && fallbackStart !== undefined ? { answerStartMs: fallbackStart } : {}),
      answerEndMs: timestamp,
      confidenceScore: hasDetectedStart ? 0.9 : 0.55,
    });
  }, [getRecordingElapsedMs, persist]);

  return { markQuestionStarted, markQuestionCompleted, markAnswerStarted, markAnswerSubmitted };
}

