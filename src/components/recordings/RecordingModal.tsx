"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Difficulty, InterviewType } from "@/lib/interview/domain";
import { RecordingEvaluation } from "./RecordingEvaluation";
import { RecordingTranscript } from "./RecordingTranscript";

type RecordingModalProps = {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    interviewId: string | null;
    videoDate: string;
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
};

type InterviewData = {
    id: string;
    role: string;
    type: InterviewType;
    difficulty: Difficulty;
    transcript: TranscriptEntry[];
    evaluation: EvaluationResult | null;
    createdAt: string;
};

type LoadingStep = "idle" | "loadingSession" | "generatingEvaluation";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error || `Request failed with status ${response.status}`);
    }
    return (await response.json()) as T;
}

export default function RecordingModal({ isOpen, onClose, videoUrl, interviewId, videoDate }: RecordingModalProps) {
    const [activeTab, setActiveTab] = useState<"results" | "transcript">("results");
    const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
    const [loadingStep, setLoadingStep] = useState<LoadingStep>("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        if (!interviewId) {
            setError("Interview session ID is missing for this recording.");
            return;
        }

        const controller = new AbortController();
        setActiveTab("results");
        setInterviewData(null);

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

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

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

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60"
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
                        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-zinc-600 backdrop-blur-md transition-colors hover:bg-black/20 hover:text-zinc-900 md:text-zinc-400 md:bg-transparent md:hover:bg-zinc-100"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

                    {/* Left Side: Video Player */}
                    <div className="flex w-full shrink-0 flex-col bg-zinc-950 md:w-1/2 lg:w-3/5">
                        <div className="flex flex-1 items-center justify-center p-4 md:p-8">
                            <video
                                src={videoUrl}
                                crossOrigin="anonymous"
                                controls
                                autoPlay
                                className="max-h-full w-full rounded-lg shadow-lg"
                            />
                        </div>
                    </div>

                    {/* Right Side: Data Panel */}
                    <div className="flex w-full flex-col bg-white md:w-1/2 lg:w-2/5 border-l border-zinc-200">
                        {/* Header */}
                        <div className="border-b border-zinc-200 p-6 pt-8 md:pt-6">
                            <h2 className="text-xl font-bold text-zinc-900">
                                {interviewData ? `${interviewData.role} Interview` : "Interview Session"}
                            </h2>
                            <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
                                <span>{videoDate}</span>
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
                                className={`border-b-2 py-4 px-1 text-sm font-medium transition-colors ${activeTab === "results" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}
                            >
                                Evaluation Results
                            </button>
                            <button
                                onClick={() => setActiveTab("transcript")}
                                className={`border-b-2 py-4 px-1 ml-6 text-sm font-medium transition-colors ${activeTab === "transcript" ? "border-blue-600 text-blue-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}
                            >
                                Transcript
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingStep !== "idle" ? (
                                <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                                    <p className="text-sm text-zinc-500">
                                        {loadingStep === "generatingEvaluation"
                                            ? "Analyzing interview transcript using AI..."
                                            : "Loading interview details..."}
                                    </p>
                                </div>
                            ) : error ? (
                                <div className="rounded-xl bg-red-50 p-4 text-red-800 border border-red-100">
                                    <p className="text-sm">{error}</p>
                                </div>
                            ) : activeTab === "results" && interviewData?.evaluation ? (
                                <RecordingEvaluation evaluation={interviewData.evaluation} />
                            ) : activeTab === "transcript" && interviewData?.transcript ? (
                                <RecordingTranscript transcript={interviewData.transcript} />
                            ) : activeTab === "results" ? (
                                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                                    Evaluation is not available for this interview yet.
                                </div>
                            ) : (
                                <RecordingTranscript transcript={[]} />
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
