"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES } from "@/data/constants";
import { getQuestionBySlug, QUESTIONS } from "@/data/questions";
import type { Difficulty, InterviewType } from "@/data/types";
import {
    IconAcademicCap,
    IconArrowLeft,
    IconCheckCircle,
    IconChartBars,
    IconChevronRight,
    IconChevronUp,
    IconClock,
    IconLightBulb,
    IconPencilSquare,
    IconPlay,
    IconSpinner,
    IconTag,
} from "@/components/ui/icons";

/* ── Tabs on the left panel ── */
type LeftTab = "description" | "solutions";

export default function QuestionDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const question = getQuestionBySlug(slug);

    /* ── State ── */
    const [leftTab, setLeftTab] = useState<LeftTab>("description");
    const [answerText, setAnswerText] = useState("");
    const [showHint, setShowHint] = useState(false);
    const [showTopics, setShowTopics] = useState(false);
    const [showSample, setShowSample] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isTimerStarted, setIsTimerStarted] = useState(false);
    const [score, setScore] = useState<{ score: number; feedback: string; state: "evaluating" | "completed" } | null>(null);
    const [rightTab, setRightTab] = useState<"answer" | "result">("answer");
    const [isSolved, setIsSolved] = useState(false);
    const [isSolveUpdating, setIsSolveUpdating] = useState(false);
    const [solveError, setSolveError] = useState<string | null>(null);

    /* ── Navigation ── */
    const currentIndex = question ? QUESTIONS.findIndex((q) => q.id === question.id) : -1;
    const prevQuestion = currentIndex > 0 ? QUESTIONS[currentIndex - 1] : null;
    const nextQuestion = currentIndex < QUESTIONS.length - 1 ? QUESTIONS[currentIndex + 1] : null;

    /* ── Helpers ── */
    const getMinutes = (t: string) => { const m = t.match(/(\d+)/); return m ? parseInt(m[1]) : 0; };
    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    const diffColor = (d: Difficulty) =>
        ({ easy: "text-emerald-400", medium: "text-amber-400", hard: "text-red-400" })[d];
    const diffLabel = (d: Difficulty) =>
        ({ easy: "Easy", medium: "Medium", hard: "Hard" })[d];
    const catInfo = (c: InterviewType) => CATEGORIES.find((x) => x.value === c);

    const evaluateAnswer = useCallback(async () => {
        if (!question) return;

        setIsTimerRunning(false);
        setScore({ score: 0, feedback: "", state: "evaluating" });
        setRightTab("result");

        try {
            const res = await fetch("/api/questions/evaluate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionId: question.id, answer: answerText }),
            });

            if (!res.ok) {
                const fallbackFeedback =
                    answerText.trim().length > 20
                        ? "Your answer was captured, but evaluation failed. Please try submitting again."
                        : "Please provide a more detailed answer and try again.";

                setScore({
                    score: 0,
                    state: "completed",
                    feedback: fallbackFeedback,
                });
                return;
            }

            const data = await res.json();
            setScore({
                score: typeof data?.score === "number" ? data.score : 0,
                feedback:
                    typeof data?.feedback === "string" && data.feedback.length > 0
                        ? data.feedback
                        : "Evaluation completed.",
                state: "completed",
            });
        } catch {
            setScore({
                score: 0,
                state: "completed",
                feedback: "Evaluation failed due to a network error. Please try again.",
            });
        }
    }, [answerText, question]);

    const handleToggleSolved = useCallback(async () => {
        if (!question || isSolveUpdating) return;

        setSolveError(null);
        setIsSolveUpdating(true);

        try {
            const res = await fetch("/api/questions/solve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ questionId: question.id }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setSolveError(typeof data?.error === "string" ? data.error : "Failed to update solved state.");
                return;
            }

            setIsSolved(Boolean(data?.solved));
        } catch {
            setSolveError("Failed to update solved state.");
        } finally {
            setIsSolveUpdating(false);
        }
    }, [isSolveUpdating, question]);

    /* ── Timer ── */
    useEffect(() => {
        if (!isTimerRunning || timeRemaining <= 0) return;
        const t = setInterval(() => {
            setTimeRemaining((p) => {
                const n = Math.max(0, p - 1);
                if (n === 0) {
                    setIsTimerRunning(false);
                    void evaluateAnswer();
                }
                return n;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [evaluateAnswer, isTimerRunning, timeRemaining]);

    useEffect(() => {
        if (!question) return;

        let isCancelled = false;

        const loadSolvedState = async () => {
            try {
                const res = await fetch("/api/questions/solve", { method: "GET" });
                if (!res.ok || isCancelled) return;
                const data = await res.json();
                const solvedIds: number[] = Array.isArray(data?.solvedQuestionIds)
                    ? data.solvedQuestionIds.filter((value: unknown): value is number => typeof value === "number")
                    : [];
                if (!isCancelled) {
                    setIsSolved(solvedIds.includes(question.id));
                }
            } catch {
                if (!isCancelled) {
                    setSolveError("Unable to load solved status.");
                }
            }
        };

        void loadSolvedState();

        return () => {
            isCancelled = true;
        };
    }, [question]);

    const handleStart = useCallback(() => {
        if (!question) return;
        setScore(null);
        setAnswerText("");
        setShowSample(false);
        setRightTab("answer");
        setTimeRemaining(getMinutes(question.estimatedTime) * 60);
        setIsTimerRunning(true);
        setIsTimerStarted(true);
    }, [question]);

    const handleSubmit = () => {
        void evaluateAnswer();
    };

    /* ── 404 ── */
    if (!question) {
        return (
            <DashboardShell>
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <h1 className="text-xl font-bold text-zinc-900">Question not found</h1>
                    <p className="mt-2 text-sm text-zinc-500">The question you&apos;re looking for doesn&apos;t exist.</p>
                    <Link href="/questions" className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 underline">
                        ← Back to Question Bank
                    </Link>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            {/* ── Full-height split layout ── */}
            <div className="-m-6 -mb-2 flex h-[calc(100vh-64px)] flex-col bg-[#1a1a2e]">
                {/* ── Top bar ── */}
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#ffffff0f] px-4">
                    <div className="flex items-center gap-3">
                        <Link href="/questions" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white">
                            <IconArrowLeft className="h-3.5 w-3.5" />
                            Problem List
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        {prevQuestion && (
                            <Link href={`/questions/${prevQuestion.slug}`} className="grid h-7 w-7 place-items-center rounded text-zinc-400 transition-colors hover:bg-[#ffffff0f] hover:text-white">
                                <IconArrowLeft className="h-4 w-4" />
                            </Link>
                        )}
                        <span className="text-xs text-zinc-500">{currentIndex + 1} / {QUESTIONS.length}</span>
                        {nextQuestion && (
                            <Link href={`/questions/${nextQuestion.slug}`} className="grid h-7 w-7 place-items-center rounded text-zinc-400 transition-colors hover:bg-[#ffffff0f] hover:text-white">
                                <IconChevronRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Split panels ── */}
                <div className="flex flex-1 min-h-0">
                    {/* ═══ LEFT PANEL: Description ═══ */}
                    <div className="flex w-1/2 flex-col border-r border-[#ffffff0f]">
                        {/* Tabs */}
                        <div className="flex shrink-0 items-center gap-1 border-b border-[#ffffff0f] px-4 py-0">
                            {(["description", "solutions"] as LeftTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setLeftTab(tab)}
                                    className={`cursor-pointer border-b-2 px-3 py-2.5 text-xs font-medium capitalize transition-colors ${leftTab === tab
                                        ? "border-white text-white"
                                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                                        }`}
                                >
                                    {tab === "description" ? "📄 Description" : "💡 Solutions"}
                                </button>
                            ))}
                        </div>

                        {/* Content (scrollable) */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {leftTab === "description" ? (
                                <div className="space-y-5">
                                    {/* Title + difficulty */}
                                    <div>
                                        <h1 className="text-lg font-bold text-white leading-relaxed">
                                            {question.id}. {question.text}
                                        </h1>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <span className={`text-xs font-semibold ${diffColor(question.difficulty)}`}>
                                                {diffLabel(question.difficulty)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description text */}
                                    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                                        <p>
                                            Prepare a structured response to this interview question. Think about specific examples from your experience and how they demonstrate the required competencies.
                                        </p>
                                        <p>
                                            <strong className="text-zinc-200">Category:</strong>{" "}
                                            <span className="text-zinc-300">{catInfo(question.category)?.label}</span>
                                        </p>
                                        <p>
                                            <strong className="text-zinc-200">Estimated Time:</strong>{" "}
                                            <span className="text-zinc-300">{question.estimatedTime}</span>
                                        </p>
                                        <div className="pt-1">
                                            <button
                                                onClick={() => {
                                                    void handleToggleSolved();
                                                }}
                                                disabled={isSolveUpdating}
                                                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${isSolved
                                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                                                    : "border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                                            >
                                                <IconCheckCircle className="h-3.5 w-3.5" />
                                                {isSolveUpdating ? "Updating..." : isSolved ? "Solved" : "Mark as Solved"}
                                            </button>
                                            {solveError && <p className="mt-2 text-xs text-red-400">{solveError}</p>}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-[#ffffff0f]" />

                                    {/* Topics (collapsible) */}
                                    <button
                                        onClick={() => setShowTopics(!showTopics)}
                                        className="flex w-full items-center justify-between py-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                                    >
                                        <span className="flex items-center gap-2">
                                            <IconTag className="h-4 w-4" />
                                            Topics
                                        </span>
                                        <IconChevronUp className={`h-4 w-4 transition-transform ${showTopics ? "rotate-180" : ""}`} />
                                    </button>
                                    {showTopics && (
                                        <div className="flex flex-wrap gap-2">
                                            {question.tags.map((tag) => (
                                                <span key={tag} className="rounded-full bg-[#ffffff0a] border border-[#ffffff14] px-3 py-1 text-xs font-medium text-zinc-300">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Hint (collapsible) */}
                                    {question.hint && (
                                        <>
                                            <button
                                                onClick={() => setShowHint(!showHint)}
                                                className="flex w-full items-center justify-between py-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <IconLightBulb className="h-4 w-4 text-amber-400" />
                                                    Hint
                                                </span>
                                                <IconChevronUp className={`h-4 w-4 transition-transform ${showHint ? "rotate-180" : ""}`} />
                                            </button>
                                            {showHint && (
                                                <p className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200 leading-relaxed">
                                                    {question.hint}
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {/* Sample answer (collapsible) */}
                                    {question.sampleAnswer && (
                                        <>
                                            <button
                                                onClick={() => setShowSample(!showSample)}
                                                className="flex w-full items-center justify-between py-1 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <IconAcademicCap className="h-4 w-4" />
                                                    Sample Answer
                                                </span>
                                                <IconChevronUp className={`h-4 w-4 transition-transform ${showSample ? "rotate-180" : ""}`} />
                                            </button>
                                            {showSample && (
                                                <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-200 leading-relaxed">
                                                    {question.sampleAnswer}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            ) : (
                                /* Solutions tab */
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[#ffffff0a] text-zinc-500">
                                        <IconLightBulb className="h-6 w-6" />
                                    </div>
                                    <p className="text-sm text-zinc-400">Community solutions coming soon.</p>
                                    <p className="mt-1 text-xs text-zinc-600">Practice this question and build your own approach.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ═══ RIGHT PANEL: Answer ═══ */}
                    <div className="flex w-1/2 flex-col">
                        {/* Top bar */}
                        <div className="flex shrink-0 items-center justify-between border-b border-[#ffffff0f] px-4 py-0">
                            <div className="flex items-center gap-1">
                                <span className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-white">
                                    <IconPencilSquare className="h-3.5 w-3.5 text-emerald-400" />
                                    Your Answer
                                </span>
                            </div>
                            {isTimerStarted && (
                                <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold ${timeRemaining <= 60 ? "bg-red-500/20 text-red-400" : "text-zinc-400"
                                    }`}>
                                    <IconClock className="h-3.5 w-3.5" strokeWidth={2} />
                                    {formatTime(timeRemaining)}
                                </div>
                            )}
                        </div>

                        {/* Answer area */}
                        <div className="flex flex-1 flex-col min-h-0">
                            {!isTimerStarted ? (
                                /* Start state */
                                <div className="flex flex-1 flex-col items-center justify-center text-center px-8">
                                    <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#ffffff08] text-zinc-500">
                                        <IconPlay className="h-7 w-7" strokeWidth={1.5} />
                                    </div>
                                    <p className="mb-1 text-sm font-medium text-zinc-300">Ready to practice?</p>
                                    <p className="mb-5 text-xs text-zinc-500">
                                        You&apos;ll have {question.estimatedTime} to write your answer.
                                    </p>
                                    <button
                                        onClick={handleStart}
                                        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/20"
                                    >
                                        Start Practice
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Textarea */}
                                    <div className="flex-1 min-h-0">
                                        <textarea
                                            value={answerText}
                                            onChange={(e) => setAnswerText(e.target.value)}
                                            placeholder="Type your answer here…"
                                            autoFocus
                                            disabled={!!score}
                                            className="h-full w-full resize-none bg-[#1e1e3a] px-5 py-4 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none disabled:opacity-60"
                                        />
                                    </div>

                                    {/* Saved + line info bar */}
                                    <div className="flex shrink-0 items-center justify-between border-t border-[#ffffff0f] bg-[#1a1a2e] px-4 py-1.5 text-xs text-zinc-500">
                                        <span>{answerText.length} chars</span>
                                        <span>Ln 1, Col 1</span>
                                    </div>

                                    {/* Bottom panel: Submit / Result */}
                                    <div className="shrink-0 border-t border-[#ffffff0f]">
                                        {/* Tab bar */}
                                        <div className="flex items-center gap-1 border-b border-[#ffffff0f] px-4">
                                            <button
                                                onClick={() => setRightTab("answer")}
                                                className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${rightTab === "answer"
                                                    ? "border-white text-white"
                                                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                📝 Submit
                                            </button>
                                            <button
                                                onClick={() => setRightTab("result")}
                                                className={`flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${rightTab === "result"
                                                    ? "border-white text-white"
                                                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                                                    }`}
                                            >
                                                <IconChartBars className="h-3.5 w-3.5" strokeWidth={2} />
                                                Result
                                            </button>
                                        </div>

                                        {/* Panel content */}
                                        <div className="h-[140px] overflow-y-auto px-5 py-3">
                                            {rightTab === "answer" ? (
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={handleSubmit}
                                                        disabled={!answerText.trim() || !!score}
                                                        className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        Submit
                                                    </button>
                                                    {score?.state === "completed" && (
                                                        <button
                                                            onClick={handleStart}
                                                            className="rounded-lg border border-[#ffffff14] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:bg-[#ffffff0a]"
                                                        >
                                                            Try Again
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    {!score ? (
                                                        <p className="py-4 text-center text-sm text-zinc-500">Submit your answer first.</p>
                                                    ) : score.state === "evaluating" ? (
                                                        <div className="flex items-center gap-3 py-4 text-sm text-blue-400 font-medium animate-pulse">
                                                            <IconSpinner className="h-5 w-5 animate-spin" />
                                                            Evaluating your answer…
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className={`text-lg font-bold ${score.score >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                                                                    {score.score}/100
                                                                </span>
                                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${score.score >= 70
                                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                                    : "bg-amber-500/20 text-amber-400"
                                                                    }`}>
                                                                    {score.score >= 70 ? "Good" : "Needs Work"}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-zinc-400 leading-relaxed">{score.feedback}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}
