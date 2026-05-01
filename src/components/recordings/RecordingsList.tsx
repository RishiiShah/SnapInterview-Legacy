"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import Modal from "@/components/ui/Modal";
import RecordingModal from "./RecordingModal";
import { IconSpinner } from "@/components/ui/icons";
import { getScoreColor, getScoreLabel } from "@/utils/helpers";

const sessionDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function formatSessionDate(value: string | Date) {
  return sessionDateFormatter.format(new Date(value));
}

type FilterType = "all" | "behavioral" | "technical" | "system-design";
type SortBy = "date" | "score";

const TYPE_LABELS: Record<FilterType, string> = {
  all: "All",
  behavioral: "Behavioral",
  technical: "Technical",
  "system-design": "System Design",
};

const TYPE_BADGE: Record<string, string> = {
  behavioral: "bg-blue-50 text-blue-700",
  technical: "bg-purple-50 text-purple-700",
  "system-design": "bg-emerald-50 text-emerald-700",
};

type SessionCard = {
  id: string;
  role: string;
  company: string | null;
  type: string;
  videoKey: string | null;
  score: number;
  createdAt: string;
};

type RecordingsListProps = {
  initialSessions: SessionCard[];
  initialHasMore: boolean;
};

export default function RecordingsList({ initialSessions, initialHasMore }: RecordingsListProps) {
  const [sessions, setSessions] = useState<SessionCard[]>(initialSessions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const isFirstRender = useRef(true);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<SessionCard | null>(null);
  const [deleteInterviewData, setDeleteInterviewData] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; interviewId: string; date: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; description: string }>({
    isOpen: false,
    title: "",
    description: "",
  });

  function buildSessionsUrl(offset: number, type: FilterType) {
    const params = new URLSearchParams({ offset: String(offset), limit: "12" });
    if (type !== "all") params.set("type", type);
    return `/api/interview/sessions?${params.toString()}`;
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;
    setIsReloading(true);
    fetch(buildSessionsUrl(0, filterType))
      .then((res) => res.json() as Promise<{ sessions: SessionCard[]; hasMore: boolean }>)
      .then((data) => {
        if (!cancelled) {
          setSessions(data.sessions);
          setHasMore(data.hasMore);
        }
      })
      .catch(() => {
        if (!cancelled) setErrorModal({ isOpen: true, title: "Error", description: "Failed to filter sessions. Please try again." });
      })
      .finally(() => {
        if (!cancelled) setIsReloading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const displayedSessions = [...sessions].sort((a, b) =>
    sortBy === "score" ? b.score - a.score : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(buildSessionsUrl(sessions.length, filterType));
      if (!res.ok) throw new Error("Failed to load more sessions");
      const data = await res.json() as { sessions: SessionCard[]; hasMore: boolean };
      setSessions((prev) => [...prev, ...data.sessions]);
      setHasMore(data.hasMore);
    } catch {
      setErrorModal({ isOpen: true, title: "Error", description: "Failed to load more sessions. Please try again." });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openSession = async (session: SessionCard) => {
    if (isOpening) return;
    const date = formatSessionDate(session.createdAt);

    if (!session.videoKey) {
      setSelectedVideo({ url: "", interviewId: session.id, date });
      return;
    }

    setIsOpening(session.id);
    try {
      const res = await fetch("/api/s3/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: session.videoKey }),
      });
      if (!res.ok) throw new Error("Failed to get video access");
      const { url } = await res.json() as { url: string };
      setSelectedVideo({ url, interviewId: session.id, date });
    } catch {
      setErrorModal({ isOpen: true, title: "Access Denied", description: "Unable to retrieve the video. Please try again later." });
    } finally {
      setIsOpening(null);
    }
  };

  const handleDeleteVideo = async () => {
    if (!sessionToDelete?.videoKey) return;

    setDeletingId(sessionToDelete.id);
    try {
      const res = await fetch("/api/s3/videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sessionToDelete.videoKey, deleteInterviewData }),
      });

      if (res.ok) {
        if (deleteInterviewData) {
          setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
        } else {
          setSessions((prev) => prev.map((s) => s.id === sessionToDelete.id ? { ...s, videoKey: null } : s));
        }
        setSessionToDelete(null);
        setDeleteInterviewData(false);
      } else {
        setErrorModal({ isOpen: true, title: "Delete Failed", description: "Failed to delete recording. Please try again later." });
      }
    } catch {
      setErrorModal({ isOpen: true, title: "Delete Error", description: "An unexpected error occurred while deleting the recording." });
    } finally {
      setDeletingId(null);
    }
  };

  const filterSortBar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {(["all", "behavioral", "technical", "system-design"] as FilterType[]).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filterType === t
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      {/* Sort toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-1">
        {(["date", "score"] as SortBy[]).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors capitalize ${
              sortBy === s ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {s === "date" ? "Newest" : "Top Score"}
          </button>
        ))}
      </div>
    </div>
  );

  if (!isReloading && sessions.length === 0 && !isLoadingMore) {
    return (
      <>
        {filterSortBar}
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/40 px-6 py-20 text-center">
          {filterType !== "all" ? (
            <>
              <p className="text-base font-semibold text-zinc-800">No {TYPE_LABELS[filterType]} sessions</p>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
                Try a different filter or start a new interview.
              </p>
              <button
                onClick={() => setFilterType("all")}
                className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Show all sessions
              </button>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-zinc-800">No sessions yet</p>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
                Your completed interview sessions will appear here.
              </p>
              <Link
                href="/practice"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
              >
                Start an Interview
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {filterSortBar}
      {isReloading ? (
        <div className="flex justify-center py-20">
          <IconSpinner className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayedSessions.map((session, idx) => {
          const date = formatSessionDate(session.createdAt);
          const hasVideo = Boolean(session.videoKey);
          const isProcessing = isOpening === session.id;

          return (
            <FadeIn
              key={session.id}
              delay={idx * 0.05}
              direction="up"
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:border-blue-200 hover:shadow-lg flex flex-col cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => !isProcessing && openSession(session)}
              onKeyDown={(event) => {
                if (isProcessing) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openSession(session);
                }
              }}
              aria-label="Open session details"
            >
              {/* Thumbnail area */}
              <div className="relative aspect-video shrink-0 bg-zinc-900 flex items-center justify-center">
                {hasVideo ? (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <svg className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v7.764a1 1 0 01-1.447.894L15 15M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-widest font-semibold opacity-40">Recording</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <svg className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-widest font-semibold opacity-40">No recording</span>
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/20">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                    {isProcessing ? (
                      <IconSpinner className="h-6 w-6 text-white" />
                    ) : (
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Info area */}
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-zinc-900">{session.role}</h3>
                    {session.company && (
                      <p className="truncate text-xs text-zinc-400">{session.company}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getScoreColor(session.score)}`}>
                      {getScoreLabel(session.score)}
                    </span>
                    {hasVideo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteInterviewData(false);
                          setSessionToDelete(session);
                        }}
                        disabled={deletingId === session.id}
                        className="flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-default disabled:opacity-50"
                        aria-label="Delete recording"
                      >
                        {deletingId === session.id ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <p className="text-xs text-zinc-400">{date}</p>
                  {session.type && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${TYPE_BADGE[session.type] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {session.type === "system-design" ? "System Design" : session.type}
                    </span>
                  )}
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>
      )}

      {!isReloading && hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-8 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <IconSpinner className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more sessions"
            )}
          </button>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={sessionToDelete !== null}
        onClose={() => {
          setSessionToDelete(null);
          setDeleteInterviewData(false);
        }}
        onConfirm={handleDeleteVideo}
        isDeleting={deletingId !== null}
        title="Delete Recording"
        description={
          deleteInterviewData
            ? "This will permanently delete the recording and all interview data (score, transcript, and feedback)."
            : "This will delete only the recording. Your score and feedback will stay available for learning progress."
        }
        confirmLabel={deleteInterviewData ? "Delete Everything" : "Delete Recording"}
        extraContent={
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left">
            <input
              type="checkbox"
              checked={deleteInterviewData}
              onChange={(e) => setDeleteInterviewData(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-xs text-zinc-600">
              Also delete interview data (score, transcript, and feedback)
            </span>
          </label>
        }
      />

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        description={errorModal.description}
        variant="danger"
        confirmLabel="OK"
      />

      {selectedVideo && (
        <RecordingModal
          isOpen={true}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.url}
          interviewId={selectedVideo.interviewId}
          videoDate={selectedVideo.date}
          onDeleted={() => {
            setSelectedVideo(null);
            setSessions((prev) => prev.filter((s) => s.id !== selectedVideo.interviewId));
          }}
        />
      )}
    </>
  );
}
