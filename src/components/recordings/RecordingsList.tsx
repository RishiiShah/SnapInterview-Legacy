"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/ui/motion";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import Modal from "@/components/ui/Modal";
import RecordingModal from "./RecordingModal";
import { CompanyMark } from "@/components/ui/CompanyMark";
import { displayCompany } from "@/lib/company-brands";
import { IconSpinner } from "@/components/ui/icons";
import { getScoreLabel } from "@/utils/helpers";
import {
  coerceInterviewType,
  INTERVIEW_TYPE_META,
  INTERVIEW_TYPE_VALUES,
  type InterviewType,
} from "@/lib/interview/domain";

const sessionDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

function formatSessionDate(value: string | Date) {
  return sessionDateFormatter.format(new Date(value));
}

type FilterType = "all" | InterviewType;
type SortBy = "date" | "score";

const FILTER_OPTIONS: FilterType[] = ["all", ...INTERVIEW_TYPE_VALUES];

function typeLabel(type: string): string {
  if (type === "all") return "All";
  const coerced = coerceInterviewType(type);
  return coerced ? INTERVIEW_TYPE_META[coerced].shortLabel : type;
}

function typeStyle(type: string): string {
  const coerced = coerceInterviewType(type);
  switch (coerced) {
    case "recruiter-screen":
    case "behavioral-leadership":
      return "text-sky-300/90 bg-sky-500/10 border-sky-500/20";
    case "coding-algorithms":
    case "domain-role":
      return "text-teal-300/90 bg-teal-500/10 border-teal-500/20";
    case "system-design":
      return "text-cyan-300/90 bg-cyan-500/10 border-cyan-500/20";
    case "take-home":
      return "text-amber-300/90 bg-amber-500/10 border-amber-500/20";
    case "hiring-manager":
      return "text-blue-300/90 bg-blue-500/10 border-blue-500/20";
    case "bar-raiser":
      return "text-rose-300/90 bg-rose-500/10 border-rose-500/20";
    default:
      return "text-[#B0B8C8] bg-white/[0.04] border-white/[0.08]";
  }
}

function scoreTone(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 70) return "text-amber-300";
  return "text-rose-300";
}

type SessionCard = {
  id: string;
  role: string;
  company: string | null;
  type: string;
  videoKey: string | null;
  score: number;
  createdAt: string;
};

type SessionCursor = Pick<SessionCard, "id" | "createdAt">;

type SessionsResponse = {
  sessions: SessionCard[];
  hasMore: boolean;
  nextCursor: SessionCursor | null;
};

type RecordingsListProps = {
  initialSessions: SessionCard[];
  initialHasMore: boolean;
  initialNextCursor?: SessionCursor | null;
  initialOpenInterviewId?: string | null;
};

export default function RecordingsList({
  initialSessions,
  initialHasMore,
  initialNextCursor = null,
  initialOpenInterviewId = null,
}: RecordingsListProps) {
  const [sessions, setSessions] = useState<SessionCard[]>(initialSessions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<SessionCursor | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const isFirstRender = useRef(true);
  const sessionsRequestVersion = useRef(0);
  const autoOpenedInterviewId = useRef<string | null>(null);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<SessionCard | null>(null);
  const [deleteInterviewData, setDeleteInterviewData] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    interviewId: string;
    date: string;
  } | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  function buildSessionsUrl(type: FilterType, cursor: SessionCursor | null = null) {
    const params = new URLSearchParams({ limit: "12" });
    if (cursor) {
      params.set("cursorCreatedAt", cursor.createdAt);
      params.set("cursorId", cursor.id);
    }
    if (type !== "all") params.set("type", type);
    return `/api/interview/sessions?${params.toString()}`;
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const requestVersion = ++sessionsRequestVersion.current;
    let cancelled = false;
    setIsReloading(true);
    fetch(buildSessionsUrl(filterType))
      .then((res) => res.json() as Promise<SessionsResponse>)
      .then((data) => {
        if (!cancelled && requestVersion === sessionsRequestVersion.current) {
          setSessions(data.sessions);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
        }
      })
      .catch(() => {
        if (!cancelled)
          setErrorModal({
            isOpen: true,
            title: "Error",
            description: "Failed to filter sessions. Please try again.",
          });
      })
      .finally(() => {
        if (!cancelled && requestVersion === sessionsRequestVersion.current) setIsReloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filterType]);

  const displayedSessions = [...sessions].sort((a, b) =>
    sortBy === "score"
      ? b.score - a.score
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;
    const requestVersion = sessionsRequestVersion.current;
    setIsLoadingMore(true);
    try {
      const res = await fetch(buildSessionsUrl(filterType, nextCursor));
      if (!res.ok) throw new Error("Failed to load more sessions");
      const data = (await res.json()) as SessionsResponse;
      if (requestVersion !== sessionsRequestVersion.current) return;
      setSessions((prev) => {
        const sessionIds = new Set(prev.map((session) => session.id));
        return [...prev, ...data.sessions.filter((session) => !sessionIds.has(session.id))];
      });
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch {
      setErrorModal({
        isOpen: true,
        title: "Error",
        description: "Failed to load more sessions. Please try again.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openSession = useCallback(
    async (session: SessionCard) => {
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
        const { url } = (await res.json()) as { url: string };
        setSelectedVideo({ url, interviewId: session.id, date });
      } catch {
        setErrorModal({
          isOpen: true,
          title: "Access Denied",
          description: "Unable to retrieve the video. Please try again later.",
        });
      } finally {
        setIsOpening(null);
      }
    },
    [isOpening],
  );

  useEffect(() => {
    if (!initialOpenInterviewId || autoOpenedInterviewId.current === initialOpenInterviewId) return;

    const target = sessions.find((session) => session.id === initialOpenInterviewId);
    if (!target) return;

    autoOpenedInterviewId.current = initialOpenInterviewId;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void openSession(target);
    });
    return () => {
      cancelled = true;
    };
  }, [initialOpenInterviewId, openSession, sessions]);

  const handleDeleteVideo = async () => {
    if (!sessionToDelete) return;

    setDeletingId(sessionToDelete.id);
    try {
      if (sessionToDelete.videoKey) {
        const res = await fetch("/api/s3/videos", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: sessionToDelete.videoKey, deleteInterviewData }),
        });

        if (res.ok) {
          if (deleteInterviewData) {
            setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
          } else {
            setSessions((prev) =>
              prev.map((s) => (s.id === sessionToDelete.id ? { ...s, videoKey: null } : s)),
            );
          }
          setSessionToDelete(null);
          setDeleteInterviewData(false);
        } else {
          setErrorModal({
            isOpen: true,
            title: "Delete Failed",
            description: "Failed to delete recording. Please try again later.",
          });
        }
      } else {
        const res = await fetch(`/api/interview/session?interviewId=${sessionToDelete.id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id));
          setSessionToDelete(null);
          setDeleteInterviewData(false);
        } else {
          setErrorModal({
            isOpen: true,
            title: "Delete Failed",
            description: "Failed to delete interview session. Please try again later.",
          });
        }
      }
    } catch {
      setErrorModal({
        isOpen: true,
        title: "Delete Error",
        description: "An unexpected error occurred while deleting.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filterSortBar = (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3 border-b border-white/[0.06] pb-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {FILTER_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={`cursor-pointer text-sm transition-colors ${
              filterType === t
                ? "text-[#E8ECF4]"
                : "text-[#A8B0C2] hover:text-[#C5CBD8]"
            }`}
          >
            {typeLabel(t)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[#6B7385]">Sort</span>
        {(["date", "score"] as SortBy[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSortBy(s)}
            className={`cursor-pointer transition-colors ${
              sortBy === s ? "text-[#E8ECF4]" : "text-[#A8B0C2] hover:text-[#C5CBD8]"
            }`}
          >
            {s === "date" ? "Newest" : "Top score"}
          </button>
        ))}
      </div>
    </div>
  );

  if (!isReloading && sessions.length === 0 && !isLoadingMore) {
    return (
      <>
        {filterSortBar}
        <div className="py-16 text-center">
          {filterType !== "all" ? (
            <>
              <p className="text-base font-medium text-[#E8ECF4]">
                No {typeLabel(filterType)} sessions
              </p>
              <p className="mt-1.5 text-sm text-[#A8B0C2]">
                Try a different filter or start a new interview.
              </p>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className="mt-5 cursor-pointer text-sm text-[#60A5FA] transition-colors hover:text-[#93C5FD]"
              >
                Show all sessions
              </button>
            </>
          ) : (
            <>
              <p className="font-display text-xl tracking-tight text-[#E8ECF4]">No sessions yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[#A8B0C2]">
                Your completed interview sessions will appear here.
              </p>
              <Link
                href="/practice"
                className="mt-6 inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#3B82F6] px-5 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]"
              >
                Start an interview
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
          <IconSpinner className="h-6 w-6 animate-spin text-[#A8B0C2]" />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {displayedSessions.map((session, idx) => {
            const date = formatSessionDate(session.createdAt);
            const hasVideo = Boolean(session.videoKey);
            const isProcessing = isOpening === session.id;

            return (
              <FadeIn
                instant
                key={session.id}
                delay={idx * 0.03}
                direction="up"
                className="group flex w-full cursor-pointer items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-white/[0.02] sm:gap-5"
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
                <CompanyMark company={displayCompany(session.company)} size="md" />

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="truncate text-[15px] font-medium leading-tight text-[#E8ECF4] group-hover:text-white">
                      {session.role}
                    </p>
                    {session.type ? (
                      <span
                        className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-medium leading-tight tracking-wide ${typeStyle(session.type)}`}
                      >
                        {typeLabel(session.type)}
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="mt-0.5 truncate text-[13px] leading-tight text-[#A8B0C2]"
                    suppressHydrationWarning
                  >
                    <span className="text-[#C5CBD8]">{displayCompany(session.company)}</span>
                    {" · "}
                    {date}
                    {!hasVideo ? " · No recording" : ""}
                  </p>
                </div>

                <div className="hidden text-right sm:block">
                  <p className="text-xs leading-none text-[#B8C0CE]">
                    {getScoreLabel(session.score)}
                  </p>
                </div>

                <span
                  className={`shrink-0 font-mono text-base tabular-nums leading-none ${scoreTone(session.score)}`}
                >
                  {session.score}
                </span>

                {isProcessing ? (
                  <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-[#60A5FA]" />
                ) : (
                  <span className="hidden w-4 text-[#B8C0CE] transition-colors group-hover:text-[#93C5FD] sm:inline">
                    →
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteInterviewData(!hasVideo);
                    setSessionToDelete(session);
                  }}
                  disabled={deletingId === session.id}
                  className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 text-[#A8B0C2] transition-colors hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-default disabled:opacity-50"
                  aria-label={hasVideo ? "Delete recording" : "Delete session"}
                >
                  {deletingId === session.id ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
                  ) : (
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  )}
                </button>
              </FadeIn>
            );
          })}
        </div>
      )}

      {!isReloading && hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="cursor-pointer text-sm text-[#A8B0C2] transition-colors hover:text-[#C5CBD8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingMore ? (
              <span className="inline-flex items-center gap-2">
                <IconSpinner className="h-4 w-4 animate-spin" />
                Loading…
              </span>
            ) : (
              "Load more sessions →"
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
        title={sessionToDelete?.videoKey ? "Delete Recording" : "Delete Interview Session"}
        description={
          !sessionToDelete?.videoKey
            ? "This will permanently delete this interview session, including your score and feedback."
            : deleteInterviewData
              ? "This will permanently delete the recording and all interview data (score, transcript, and feedback)."
              : "This will delete only the recording. Your score and feedback will stay available for learning progress."
        }
        confirmLabel={
          !sessionToDelete?.videoKey || deleteInterviewData
            ? "Delete Everything"
            : "Delete Recording"
        }
        extraContent={
          sessionToDelete?.videoKey ? (
            <label className="flex cursor-pointer items-start gap-2 border-b border-white/[0.08] px-1 py-2 text-left">
              <input
                type="checkbox"
                checked={deleteInterviewData}
                onChange={(e) => setDeleteInterviewData(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-rose-500 focus:ring-rose-500/40"
              />
              <span className="text-xs text-[#A8B0C2]">
                Also delete interview data (score, transcript, and feedback)
              </span>
            </label>
          ) : null
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
