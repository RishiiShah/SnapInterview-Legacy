"use client";

import type { Question } from "@/data/types";
import {
    IconChartBars,
    IconChevronRight,
    IconClock,
    IconPencilSquare,
    IconPractice,
    IconSpinner,
} from "@/components/ui/icons";

export type RightTab = "answer" | "result";

interface QuestionRightPanelProps {
    question: Question;
    answerText: string;
    setAnswerText: (text: string) => void;
    timeRemaining: number;
    isTimerStarted: boolean;
    score: { score: number; feedback: string; state: "evaluating" | "completed" } | null;
    rightTab: RightTab;
    setRightTab: (tab: RightTab) => void;
    handleStart: () => void;
    handleSubmit: () => void;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

export function QuestionRightPanel({
    question, answerText, setAnswerText, timeRemaining, isTimerStarted, score,
    rightTab, setRightTab, handleStart, handleSubmit
}: QuestionRightPanelProps) {
    return (
        <div className="flex w-1/2 flex-col bg-white">
            {/* Top bar */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-0 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-1">
                    <span className="flex items-center gap-2 px-3 py-3 text-xs font-bold text-zinc-900">
                        <IconPencilSquare className="h-4 w-4 text-sky-500" />
                        Editor
                    </span>
                </div>
                {isTimerStarted && (
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold font-mono border ${
                        timeRemaining <= 60 
                            ? "bg-red-50 border-red-100 text-red-600" 
                            : "bg-zinc-50 border-zinc-100 text-zinc-600"
                        }`}>
                        <IconClock className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {formatTime(timeRemaining)}
                    </div>
                )}
            </div>

            {/* Answer area */}
            <div className="flex flex-1 flex-col min-h-0">
                {!isTimerStarted ? (
                    /* Start state */
                    <div className="flex flex-1 flex-col items-center justify-center text-center px-10">
                        <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-600">
                            <IconPractice className="h-8 w-8" strokeWidth={2} />
                        </div>
                        <h3 className="mb-2 text-sm font-bold text-zinc-900 tracking-tight">Ready to practice?</h3>
                        <p className="mb-8 text-xs text-zinc-600 leading-relaxed max-w-[240px]">
                            You&apos;ll have <span className="font-semibold text-zinc-900">{question.estimatedTime}</span> to write your answer and receive AI feedback.
                        </p>
                        <button
                            onClick={handleStart}
                            className="group cursor-pointer relative overflow-hidden rounded-xl bg-zinc-900 px-8 py-3 text-xs font-bold text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 hover:-translate-y-0.5"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start Question
                                <IconChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                            </span>
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Textarea */}
                        <div className="flex-1 min-h-0 bg-white">
                            <textarea
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                placeholder="Type your answer here…"
                                autoFocus
                                disabled={!!score}
                                className="h-full w-full resize-none bg-zinc-50/30 px-6 py-6 font-mono text-sm text-zinc-900 placeholder-zinc-300 outline-none disabled:opacity-50 transition-colors focus:bg-white"
                            />
                        </div>

                        {/* Saved + line info bar */}
                        <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 bg-white px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                            <span>{answerText.length} characters</span>
                            <span>Ln 1, Col 1</span>
                        </div>

                        {/* Bottom panel: Submit / Result */}
                        <div className="shrink-0 border-t border-zinc-200 bg-zinc-50/30 backdrop-blur-sm">
                            {/* Tab bar */}
                            <div className="flex items-center gap-1 border-b border-zinc-100 px-4">
                                <button
                                    onClick={() => setRightTab("answer")}
                                    className={`relative cursor-pointer px-4 py-2 text-xs font-bold transition-all ${
                                        rightTab === "answer"
                                            ? "text-zinc-900"
                                            : "text-zinc-600 hover:text-zinc-600"
                                    }`}
                                >
                                    📝 Submit
                                    {rightTab === "answer" && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full mx-2" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setRightTab("result")}
                                    className={`relative cursor-pointer px-4 py-2 text-xs font-bold transition-all ${
                                        rightTab === "result"
                                            ? "text-zinc-900"
                                            : "text-zinc-600 hover:text-zinc-600"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <IconChartBars className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        Result
                                    </span>
                                    {rightTab === "result" && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 rounded-full mx-2" />
                                    )}
                                </button>
                            </div>

                            {/* Panel content */}
                            <div className="h-35 overflow-y-auto px-5 py-3">
                                {rightTab === "answer" ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!answerText.trim() || !!score}
                                            className="rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/10 transition-all hover:bg-sky-500 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
                                        >
                                            Submit Answer
                                        </button>
                                        {score?.state === "completed" && (
                                            <button
                                                onClick={handleStart}
                                                className="rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-xs font-bold text-zinc-700 transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:-translate-y-0.5"
                                            >
                                                Try Again
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {!score ? (
                                            <p className="py-4 text-center text-sm text-zinc-600">Submit your answer first.</p>
                                        ) : score.state === "evaluating" ? (
                                            <div className="flex items-center justify-center gap-3 py-6 text-sm text-sky-600 font-bold">
                                                <IconSpinner className="h-5 w-5 animate-spin" />
                                                Analyzing your response…
                                            </div>
                                        ) : (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="flex items-center gap-4">
                                                    <div className={`text-2xl font-black ${score.score >= 70 ? "text-sky-600" : "text-amber-600"}`}>
                                                        {score.score}%
                                                    </div>
                                                    <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${score.score >= 70
                                                        ? "bg-sky-50 text-sky-700 border border-sky-100"
                                                        : "bg-amber-50 text-amber-700 border border-amber-100"
                                                        }`}>
                                                        {score.score >= 70 ? "Excellent" : "Needs Review"}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-zinc-600 leading-relaxed font-medium">{score.feedback}</p>
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
    );
}
