"use client";

import type { Question } from "@/data/types";
import {
    IconChartBars,
    IconClock,
    IconPencilSquare,
    IconPlay,
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
                            <div className="h-35 overflow-y-auto px-5 py-3">
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
    );
}
