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

export default function RecordingModal({ isOpen, onClose, videoUrl, interviewId, videoDate, onDeleted }: RecordingModalProps) {
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
            const data = await res.json() as { shareToken: string };
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
                // 1. Fetch the interview object (which includes transcript and potentially cached evaluation)
                let data = await fetchJson<InterviewData>(`/api/interview/${interviewId}`, {
                    signal: controller.signal,
                    cache: "force-cache",
                });

                // 2. If there's no cached evaluation, we must generate it now
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

                // fetch existing share token (non-blocking)
                fetch(`/api/interview/${interviewId}/share`, { signal: controller.signal })
                    .then((r) => r.ok ? r.json() as Promise<{ shareToken: string | null }> : null)
                    .then((d) => { if (d) setShareToken(d.shareToken); })
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

    return (
        <ModalPortal isOpen={isOpen}>
            <AnimatePresence>
                {isOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex min-h-dvh items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 md:flex-row"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Interview recording details"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-zinc-600 backdrop-blur-md transition-colors hover:bg-black/20 hover:text-zinc-900 md:text-zinc-600 md:bg-transparent md:hover:bg-zinc-100"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

                    {/* Left Side: Video Player or No-video Placeholder */}
                    <div className="flex w-full shrink-0 flex-col bg-zinc-950 md:w-1/2 lg:w-3/5">
                        <div className="flex flex-1 items-center justify-center p-4 md:p-8">
                            {videoUrl ? (
                                <video
                                    src={videoUrl}
                                    crossOrigin="anonymous"
                                    controls
                                    autoPlay
                                    className="max-h-full w-full rounded-lg shadow-lg"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <svg className="h-12 w-12 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                                    </svg>
                                    <p className="text-sm text-zinc-600">No recording available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Data Panel */}
                    <div className="flex w-full flex-col bg-white md:w-1/2 lg:w-2/5 border-l border-zinc-200">
                        {/* Header */}
                        <div className="border-b border-zinc-200 p-6 pt-8 md:pt-6">
                            <div className="flex items-start justify-between gap-3">
                                <h2 className="text-xl font-bold text-zinc-900">
                                    {interviewData ? `${interviewData.role} Interview` : "Interview Session"}
                                </h2>
                                {interviewData && loadingStep === "idle" && (
                                    <div className="flex shrink-0 items-center gap-2">
                                        {/* Share button */}
                                        {shareToken ? (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/share/${shareToken}`;
                                                        void navigator.clipboard.writeText(url).then(() => {
                                                            setShareCopied(true);
                                                            setTimeout(() => setShareCopied(false), 2500);
                                                        });
                                                    }}
                                                    className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                                                    </svg>
                                                    {shareCopied ? "Copied!" : "Copy link"}
                                                </button>
                                                <button
                                                    onClick={() => void handleRevokeShare()}
                                                    disabled={sharingLoading}
                                                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-red-500 disabled:opacity-50"
                                                    title="Remove share link"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => void handleShare()}
                                                disabled={sharingLoading}
                                                className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                                </svg>
                                                Share
                                            </button>
                                        )}
                                        <button
                                            onClick={handleRetake}
                                            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                            </svg>
                                            Retake
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-sm text-zinc-600">
                                <span suppressHydrationWarning>{videoDate}</span>
                                {interviewData && (
                                    <>
                                        <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                        <span className="capitalize">{interviewData.type}</span>
                                        <span className="h-1 w-1 rounded-full bg-zinc-300" />
                                        <span className="capitalize">{interviewData.difficulty}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-zinc-200 px-6">
                            <button
                                onClick={() => setActiveTab("results")}
                                className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${activeTab === "results" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-600 hover:text-zinc-700 hover:border-zinc-300"}`}
                            >
                                Evaluation Results
                            </button>
                            <button
                                onClick={() => setActiveTab("transcript")}
                                className={`border-b-2 py-4 px-1 ml-6 text-sm font-medium transition-colors ${activeTab === "transcript" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-600 hover:text-zinc-700 hover:border-zinc-300"}`}
                            >
                                Transcript
                            </button>
                        </div>

                        {/* Delete footer — only for sessions with no video */}
                        {!videoUrl && interviewId && loadingStep === "idle" && (
                            <div className="border-t border-zinc-100 p-4">
                                {!confirmingDelete ? (
                                    <button
                                        onClick={() => setConfirmingDelete(true)}
                                        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                                    >
                                        Delete interview data
                                    </button>
                                ) : (
                                    <div className="space-y-2.5">
                                        <p className="text-xs text-zinc-600">This will permanently remove the transcript and evaluation. Are you sure?</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setConfirmingDelete(false)}
                                                className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                                            >
                                                Yes, delete
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingStep !== "idle" ? (
                                <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                                    <p className="text-sm text-zinc-600">
                                        {loadingStep === "generatingEvaluation"
                                            ? "Analyzing interview transcript using AI..."
                                            : loadingStep === "deleting"
                                            ? "Deleting interview data..."
                                            : "Loading interview details..."}
                                    </p>
                                </div>
                            ) : displayError ? (
                                <div className="rounded-xl bg-red-50 p-4 text-red-800 border border-red-100">
                                    <p className="text-sm">{displayError}</p>
                                </div>
                            ) : activeTab === "results" && interviewData?.evaluation ? (
                                <RecordingEvaluation evaluation={interviewData.evaluation} />
                            ) : activeTab === "transcript" && interviewData?.transcript ? (
                                <RecordingTranscript
                                    transcript={interviewData.transcript}
                                    interviewId={interviewData.id}
                                    feedback={interviewData.feedback}
                                />
                            ) : activeTab === "results" ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    Evaluation is not available for this interview yet.
                                </div>
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
