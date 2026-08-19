"use client";

import { useCallback, useEffect, useState } from "react";

export type Countdown = {
  seconds: number;
  reset: (seconds?: number) => void;
};

export function useCountdown(initialSeconds: number): Countdown {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [resetVersion, setResetVersion] = useState(0);
  const isRunning = seconds > 0;

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => clearInterval(interval);
  }, [isRunning, resetVersion]);

  const reset = useCallback(
    (nextSeconds = initialSeconds) => {
      setSeconds(nextSeconds);
      setResetVersion((version) => version + 1);
    },
    [initialSeconds],
  );

  return { seconds, reset };
}
