import { useEffect, useMemo, useRef, useState } from "react";

export type UseInterviewCountdownOptions = {
  interviewStarted: boolean;
  interviewDone: boolean;
  durationMinutes: number;
  sessionCreatedAt: string | null;
  onExpired: () => void;
};

export type InterviewCountdownState = {
  timeRemainingMs: number | null;
  timeRemainingFormatted: string | null;
  timeProgressPercent: number | null;
  isGraceWarningActive: boolean;
};

export function useInterviewCountdown({
  interviewStarted,
  interviewDone,
  durationMinutes,
  sessionCreatedAt,
  onExpired,
}: UseInterviewCountdownOptions): InterviewCountdownState {
  const [timeRemainingMs, setTimeRemainingMs] = useState<number | null>(null);
  const activationTimeRef = useRef<number | null>(null);
  const expiredRef = useRef(false);
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    if (!interviewStarted) {
      activationTimeRef.current = null;
      expiredRef.current = false;
      setTimeRemainingMs(null);
      return;
    }
    if (interviewDone) return;

    if (activationTimeRef.current === null) {
      const persistedStart = sessionCreatedAt
        ? new Date(sessionCreatedAt).getTime()
        : Number.NaN;
      activationTimeRef.current = Number.isFinite(persistedStart)
        ? persistedStart
        : Date.now();
    }

    const startTime = activationTimeRef.current;
    const totalMs = durationMinutes * 60_000;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      setTimeRemainingMs(Math.max(0, totalMs - elapsed));

      if (elapsed >= totalMs + 60_000 && !expiredRef.current) {
        expiredRef.current = true;
        onExpiredRef.current();
      }
    };

    tick();

    const elapsedRemainder = ((Date.now() - startTime) % 1_000 + 1_000) % 1_000;
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    let alignmentTimeout: ReturnType<typeof setTimeout> | null = null;

    if (elapsedRemainder === 0) {
      timerInterval = setInterval(tick, 1_000);
    } else {
      alignmentTimeout = setTimeout(() => {
        tick();
        timerInterval = setInterval(tick, 1_000);
      }, 1_000 - elapsedRemainder);
    }

    return () => {
      if (alignmentTimeout !== null) clearTimeout(alignmentTimeout);
      if (timerInterval !== null) clearInterval(timerInterval);
    };
  }, [interviewStarted, interviewDone, durationMinutes, sessionCreatedAt]);

  const timeRemainingFormatted = useMemo(() => {
    if (timeRemainingMs === null) return null;
    const totalSeconds = Math.ceil(timeRemainingMs / 1_000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [timeRemainingMs]);

  const totalMs = durationMinutes * 60_000;
  const timeProgressPercent =
    timeRemainingMs === null
      ? null
      : Math.min(100, Math.max(0, ((totalMs - timeRemainingMs) / totalMs) * 100));

  return {
    timeRemainingMs,
    timeRemainingFormatted,
    timeProgressPercent,
    isGraceWarningActive:
      timeRemainingMs !== null && timeRemainingMs <= 60_000 && timeRemainingMs > 0,
  };
}
