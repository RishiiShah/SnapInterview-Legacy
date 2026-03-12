"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";

import { getQuestionBySlug, QUESTIONS } from "@/data/questions";
import { IconArrowLeft, IconChevronRight } from "@/components/ui/icons";
import { QuestionLeftPanel, type LeftTab } from "@/components/questions/QuestionLeftPanel";
import { QuestionRightPanel, type RightTab } from "@/components/questions/QuestionRightPanel";

export default function QuestionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
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
    const [rightTab, setRightTab] = useState<RightTab>("answer");
    const [isSolved, setIsSolved] = useState(false);
    const [isSolveUpdating, setIsSolveUpdating] = useState(false);
    const [solveError, setSolveError] = useState<string | null>(null);

    /* ── Navigation ── */
    const currentIndex = question ? QUESTIONS.findIndex((q) => q.id === question.id) : -1;
    const prevQuestion = currentIndex > 0 ? QUESTIONS[currentIndex - 1] : null;
    const nextQuestion = currentIndex < QUESTIONS.length - 1 ? QUESTIONS[currentIndex + 1] : null;

    /* ── Helpers ── */
    const getMinutes = (t: string) => { const m = t.match(/(\d+)/); return m ? parseInt(m[1]) : 0; };

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
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <h1 className="text-xl font-bold text-zinc-900">Question not found</h1>
                <p className="mt-2 text-sm text-zinc-500">The question you&apos;re looking for doesn&apos;t exist.</p>
                <Link href="/questions" className="mt-4 text-sm font-medium text-zinc-600 hover:text-zinc-900 underline">
                    ← Back to Question Bank
                </Link>
            </div>
        );
    }

    return (
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
                <QuestionLeftPanel
                    question={question}
                    leftTab={leftTab}
                    setLeftTab={setLeftTab}
                    showHint={showHint}
                    setShowHint={setShowHint}
                    showTopics={showTopics}
                    setShowTopics={setShowTopics}
                    showSample={showSample}
                    setShowSample={setShowSample}
                    isSolved={isSolved}
                    isSolveUpdating={isSolveUpdating}
                    solveError={solveError}
                    handleToggleSolved={handleToggleSolved}
                />
                <QuestionRightPanel
                    question={question}
                    answerText={answerText}
                    setAnswerText={setAnswerText}
                    timeRemaining={timeRemaining}
                    isTimerStarted={isTimerStarted}
                    score={score}
                    rightTab={rightTab}
                    setRightTab={setRightTab}
                    handleStart={handleStart}
                    handleSubmit={handleSubmit}
                />
            </div>
        </div>
    );
}
