"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Difficulty, InterviewType } from "@/lib/interview/domain";
import { RecordingEvaluation } from "./RecordingEvaluation";
import { RecordingTranscript } from "./RecordingTranscript";
import ModalPortal from "@/components/ui/ModalPortal";

type RecordingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  interviewId: string | null;
  videoDate: string;
  onDeleted?: () => void;
};

type TranscriptEntry = {
  id: string;
  order: number;
  question: string;
  answer: string;
};

type EvaluationResult = {
  score: number;
  feedback: string;
  strengths: string[];
  areasForImprovement: string[];
  communication?: number;
  technicalDepth?: number;
  clarity?: number;
};

type FeedbackEntry = {
  questionOrder: number;
  rating: string;
};

type InterviewData = {
  id: string;
  role: string;
  type: InterviewType;
  difficulty: Difficulty;
  transcript: TranscriptEntry[];
  evaluation: EvaluationResult | null;
  feedback: FeedbackEntry[];
  createdAt: string;
};

type LoadingStep = "idle" | "loadingSession" | "generatingEvaluation" | "deleting";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export default function RecordingModal({
  isOpen,
  onClose,
  videoUrl,
  interviewId,
  videoDate,
  onDeleted,
}: RecordingModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"results" | "transcript">("results");
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [shareToken, setShareToken] = useState<string | null | undefined>(undefined);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function handleRetake() {
    if (!interviewData) return;
    const params = new URLSearchParams({
      role: interviewData.role,
      type: interviewData.type,
      difficulty: interviewData.difficulty,
    });
    router.push(`/practice?${params.toString()}`);
    onClose();
  }

  async function handleDelete() {
    if (!interviewId) return;
    setLoadingStep("deleting");
    try {
      const res = await fetch(`/api/interview/${interviewId}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted?.();
        onClose();
      } else {
        setError("Failed to delete interview data. Please try again.");
        setLoadingStep("idle");
      }
    } catch {
      setError("Failed to delete interview data. Please try again.");
      setLoadingStep("idle");
    }
    setConfirmingDelete(false);
  }

  async function handleShare() {
    if (!interviewId) return;
    setSharingLoading(true);
    try {
      const res = await fetch(`/api/interview/${interviewId}/share`, { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { shareToken: string };
      setShareToken(data.shareToken);
      const url = `${window.location.origin}/share/${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } finally {
      setSharingLoading(false);
    }
  }

  async function handleRevokeShare() {
    if (!interviewId) return;
    setSharingLoading(true);
    try {
      const res = await fetch(`/api/interview/${interviewId}/share`, { method: "DELETE" });
      if (res.ok) setShareToken(null);
    } finally {
      setSharingLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !interviewId) return;

    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveTab("results");
    setInterviewData(null);
    setShareToken(undefined);

    async function fetchData() {
      setLoadingStep("loadingSession");
      setError(null);

      try {
        let data = await fetchJson<InterviewData>(`/api/interview/${interviewId}`, {
          signal: controller.signal,
          cache: "force-cache",
        });

        if (!data.evaluation) {
          setLoadingStep("generatingEvaluation");
          const evaluation = await fetchJson<EvaluationResult>("/api/interview/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interviewId }),
            signal: controller.signal,
          });
          data = { ...data, evaluation };
        }

        setInterviewData(data);

        fetch(`/api/interview/${interviewId}/share`, { signal: controller.signal })
          .then((r) => (r.ok ? (r.json() as Promise<{ shareToken: string | null }>) : null))
          .then((d) => {
            if (d) setShareToken(d.shareToken);
          })
          .catch(() => {});
      } catch (err: unknown) {
        if ((err as { name?: string })?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
      } finally {
        setLoadingStep("idle");
      }
    }

    fetchData();

    return () => {
      controller.abort();
    };
  }, [isOpen, interviewId]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayError = !interviewId
    ? "Interview session ID is missing for this recording."
    : error;

  const actionBtn =
    "cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.05] hover:text-[#E8ECF4] disabled:opacity-50";

  return (
    <ModalPortal isOpen={isOpen}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex min-h-dvh items-center justify-center bg-[#090A0F]/70 p-4 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0F1A] md:flex-row"
              role="dialog"
              aria-modal="true"
              aria-label="Interview recording details"
            >
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#A8B0C2] transition-colors hover:bg-white/[0.06] hover:text-[#E8ECF4]"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Video plane */}
              <div className="flex w-full shrink-0 flex-col bg-[#070910] md:w-1/2 lg:w-3/5">
                <div className="flex flex-1 items-center justify-center p-4 md:p-8">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      crossOrigin="anonymous"
                      controls
                      autoPlay
                      className="max-h-full w-full rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-[#A8B0C2]">No recording available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Data panel */}
              <div className="flex w-full flex-col border-l border-white/[0.08] bg-[#0C0F1A] md:w-1/2 lg:w-2/5">
                <div className="border-b border-white/[0.06] px-6 pb-4 pt-6">
                  <div className="flex items-start justify-between gap-3 pr-8">
                    <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">
                      {interviewData ? interviewData.role : "Interview session"}
                    </h2>
                    {interviewData && loadingStep === "idle" && (
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {shareToken ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/share/${shareToken}`;
                                void navigator.clipboard.writeText(url).then(() => {
                                  setShareCopied(true);
                                  setTimeout(() => setShareCopied(false), 2500);
                                });
                              }}
                              className={`${actionBtn} text-emerald-400 hover:text-emerald-300`}
                            >
                              {shareCopied ? "Copied" : "Copy link"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRevokeShare()}
                              disabled={sharingLoading}
                              className={actionBtn}
                              title="Remove share link"
                            >
                              Revoke
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleShare()}
                            disabled={sharingLoading}
                            className={actionBtn}
                          >
                            Share
                          </button>
                        )}
                        <button type="button" onClick={handleRetake} className={actionBtn}>
                          Retake
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#A8B0C2]" suppressHydrationWarning>
                    {videoDate}
                    {interviewData
                      ? ` · ${interviewData.type.replace(/[_-]+/g, " ")} · ${interviewData.difficulty}`
                      : ""}
                  </p>
                </div>

                <div className="flex gap-6 border-b border-white/[0.06] px-6">
                  {(
                    [
                      { id: "results" as const, label: "Evaluation" },
                      { id: "transcript" as const, label: "Transcript" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`cursor-pointer border-b-2 py-3.5 text-sm transition-colors ${
                        activeTab === tab.id
                          ? "border-[#3B82F6] text-[#E8ECF4]"
                          : "border-transparent text-[#A8B0C2] hover:text-[#C5CBD8]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {!videoUrl && interviewId && loadingStep === "idle" && (
                  <div className="border-b border-white/[0.06] px-6 py-3">
                    {!confirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        className="cursor-pointer text-sm text-rose-300/80 transition-colors hover:text-rose-300"
                      >
                        Delete interview data
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs text-[#A8B0C2]">Permanently remove transcript and evaluation?</p>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(false)}
                          className="cursor-pointer text-xs text-[#C5CBD8] hover:text-[#E8ECF4]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="cursor-pointer text-xs font-medium text-rose-300 hover:text-rose-200"
                        >
                          Yes, delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {loadingStep !== "idle" ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
                      <p className="text-sm text-[#A8B0C2]">
                        {loadingStep === "generatingEvaluation"
                          ? "Analyzing interview transcript…"
                          : loadingStep === "deleting"
                            ? "Deleting interview data…"
                            : "Loading interview details…"}
                      </p>
                    </div>
                  ) : displayError ? (
                    <p className="text-sm text-rose-300">{displayError}</p>
                  ) : activeTab === "results" && interviewData?.evaluation ? (
                    <RecordingEvaluation evaluation={interviewData.evaluation} />
                  ) : activeTab === "transcript" && interviewData?.transcript ? (
                    <RecordingTranscript
                      transcript={interviewData.transcript}
                      interviewId={interviewData.id}
                      feedback={interviewData.feedback}
                    />
                  ) : activeTab === "results" ? (
                    <p className="text-sm text-[#A8B0C2]">
                      Evaluation is not available for this interview yet.
                    </p>
                  ) : (
                    <RecordingTranscript transcript={[]} interviewId={interviewId ?? ""} feedback={[]} />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
