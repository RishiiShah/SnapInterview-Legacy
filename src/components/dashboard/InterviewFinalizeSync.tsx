"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const sync = async () => {
      const pendingIds = getPendingInterviewFinalizeIds();
      if (pendingIds.length === 0) {
        setBanner(null);
        return;
      }

      setBanner("Saving your recording and updating analytics…");

      let shouldRefresh = false;
      for (const interviewId of pendingIds) {
        try {
          const response = await fetch(`/api/interview/session?interviewId=${encodeURIComponent(interviewId)}`);
          if (!response.ok) continue;
          const payload = (await response.json()) as SessionStatusResponse;
          if (payload.status === "COMPLETED" || payload.status === "ABORTED") {
            clearPendingInterviewFinalize(interviewId);
            shouldRefresh = true;
          }
        } catch {
          // Keep polling until finalize completes or user leaves.
        }
      }

      const remaining = getPendingInterviewFinalizeIds();
      if (remaining.length === 0) {
        setBanner(null);
        if (shouldRefresh) {
          router.refresh();
        }
      }
    };

    void sync();
    const interval = window.setInterval(() => {
      void sync();
    }, 2000);

    return () => window.clearInterval(interval);
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
