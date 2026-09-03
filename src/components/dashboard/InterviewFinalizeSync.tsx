"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  clearPendingInterviewFinalize,
  getPendingInterviewFinalizeIds,
} from "@/lib/interview/finalize-pending-client";

type SessionStatusResponse = {
  status?: string;
};

export default function InterviewFinalizeSync() {
  const router = useRouter();
  const [banner, setBanner] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    const startTime = Date.now();
    const MAX_POLL_MS = 60_000;

    const sync = async () => {
      if (syncInFlightRef.current) return;

      const pendingIds = getPendingInterviewFinalizeIds();
      if (pendingIds.length === 0) {
        if (isMountedRef.current) setBanner(null);
        return;
      }

      // Give up after 60s — stale entries shouldn't block the dashboard forever
      if (Date.now() - startTime > MAX_POLL_MS) {
        for (const id of pendingIds) clearPendingInterviewFinalize(id);
        if (isMountedRef.current) setBanner(null);
        return;
      }

      syncInFlightRef.current = true;
      if (isMountedRef.current) setBanner("Saving your recording and updating analytics…");

      try {
        const completedIds = (await Promise.all(pendingIds.map(async (interviewId) => {
          try {
          const response = await fetch(`/api/interview/session?interviewId=${encodeURIComponent(interviewId)}`);
            if (response.status === 404 || response.status === 410) return interviewId;
            if (!response.ok) return null;
          const payload = (await response.json()) as SessionStatusResponse;
          if (payload.status === "COMPLETED" || payload.status === "ABORTED") {
              return interviewId;
          }
            return null;
          } catch {
            // Keep polling until finalize completes or user leaves.
            return null;
          }
        }))).filter((interviewId): interviewId is string => interviewId !== null);

        if (!isMountedRef.current) return;

        for (const interviewId of completedIds) {
          clearPendingInterviewFinalize(interviewId);
        }

        const remaining = getPendingInterviewFinalizeIds();
        if (remaining.length === 0) {
          setBanner(null);
          if (completedIds.length > 0) {
            router.refresh();
          }
        }
      } finally {
        syncInFlightRef.current = false;
      }
    };

    void sync();
    const interval = window.setInterval(() => {
      void sync();
    }, 2000);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [router]);

  if (!banner) return null;

  return (
    <div
      role="status"
      className="mb-6 flex items-center gap-3 rounded-lg border border-[#3B82F6]/25 bg-[#3B82F6]/10 px-4 py-3 text-sm text-[#E8ECF4]"
    >
      <span
        className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#93C5FD] border-t-transparent"
        aria-hidden
      />
      {banner}
    </div>
  );
}
