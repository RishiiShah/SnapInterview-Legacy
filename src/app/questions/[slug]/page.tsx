"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES } from "@/data/constants";
import { getQuestionBySlug, QUESTIONS } from "@/data/questions";
import type { Difficulty, InterviewType } from "@/data/types";

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

    /* ── Timer ── */
    useEffect(() => {
        if (!isTimerRunning || timeRemaining <= 0) return;
        const t = setInterval(() => {
            setTimeRemaining((p) => {
                const n = Math.max(0, p - 1);
                if (n === 0) {
                    setIsTimerRunning(false);
                    setScore({ score: 0, feedback: "", state: "evaluating" });
                    setTimeout(() => {
                        const s = answerText.trim().length > 10 ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 30;
                        setScore({
                            score: s, state: "completed",
                            feedback: answerText.trim().length > 10
                                ? "Good response. Consider using the STAR method for more structure and quantifying your impact."
                                : "Your response was quite short. Try adding more details, examples, and structure.",
                        });
                        setRightTab("result");
                    }, 2000);
                }
                return n;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [isTimerRunning, timeRemaining, answerText]);

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
        setIsTimerRunning(false);
        setScore({ score: 0, feedback: "", state: "evaluating" });
        setRightTab("result");
        setTimeout(() => {
            const s = answerText.trim().length > 10 ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 30;
            setScore({
                score: s, state: "completed",
                feedback: answerText.trim().length > 10
                    ? "Good response. Consider using the STAR method for more structure and quantifying your impact."
                    : "Your response was quite short. Try adding more details, examples, and structure.",
            });
            // Persist solved status
            if (question) {
                try {
                    const solved: number[] = JSON.parse(localStorage.getItem("solvedQuestions") || "[]");
                    if (!solved.includes(question.id)) {
                        localStorage.setItem("solvedQuestions", JSON.stringify([...solved, question.id]));
                    }
                } catch { /* ignore */ }
            }
        }, 2000);
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
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                            Problem List
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        {prevQuestion && (
                            <Link href={`/questions/${prevQuestion.slug}`} className="grid h-7 w-7 place-items-center rounded text-zinc-400 transition-colors hover:bg-[#ffffff0f] hover:text-white">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                            </Link>
                        )}
                        <span className="text-xs text-zinc-500">{currentIndex + 1} / {QUESTIONS.length}</span>
                        {nextQuestion && (
                            <Link href={`/questions/${nextQuestion.slug}`} className="grid h-7 w-7 place-items-center rounded text-zinc-400 transition-colors hover:bg-[#ffffff0f] hover:text-white">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
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
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-[#ffffff0f]" />

                                    {/* Topics (collapsible) */}
                                    <button
                                        onClick={() => setShowTopics(!showTopics)}
                                        className="flex w-full items-center justify-between py-1 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                                    >
                                        <span className="flex items-center gap-2">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                                            </svg>
                                            Topics
                                        </span>
                                        <svg className={`h-4 w-4 transition-transform ${showTopics ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
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
                                                    <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                                    </svg>
                                                    Hint
                                                </span>
                                                <svg className={`h-4 w-4 transition-transform ${showHint ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                                </svg>
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
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                                                    </svg>
                                                    Sample Answer
                                                </span>
                                                <svg className={`h-4 w-4 transition-transform ${showSample ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                                </svg>
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
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                                        </svg>
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
                                    <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                    Your Answer
                                </span>
                            </div>
                            {isTimerStarted && (
                                <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-mono font-semibold ${timeRemaining <= 60 ? "bg-red-500/20 text-red-400" : "text-zinc-400"
                                    }`}>
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
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
                                        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
                                        </svg>
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
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                                                </svg>
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
                                                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                            </svg>
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
