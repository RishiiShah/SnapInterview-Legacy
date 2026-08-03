"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Orientation = "horizontal" | "vertical";

/**
 * Pointer-drag split sizing. Returns the primary pane size as a percentage.
 */
export function useResizableSplit({
  orientation,
  initialPercent,
  minPercent,
  maxPercent,
  storageKey,
}: {
  orientation: Orientation;
  initialPercent: number;
  minPercent: number;
  maxPercent: number;
  storageKey?: string;
}) {
  const [percent, setPercent] = useState(() => {
    if (typeof window === "undefined" || !storageKey) return initialPercent;
    try {
      const raw = localStorage.getItem(storageKey);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n >= minPercent && n <= maxPercent) return n;
    } catch {
      // ignore
    }
    return initialPercent;
  });

  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, String(percent));
    } catch {
      // ignore
    }
  }, [percent, storageKey]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.cursor = orientation === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [orientation],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const next =
        orientation === "horizontal"
          ? ((event.clientX - rect.left) / rect.width) * 100
          : ((event.clientY - rect.top) / rect.height) * 100;
      setPercent(Math.min(maxPercent, Math.max(minPercent, next)));
    },
    [orientation, minPercent, maxPercent],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  return {
    percent,
    containerRef,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
