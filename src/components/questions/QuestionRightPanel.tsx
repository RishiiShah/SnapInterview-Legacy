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
        <div className="flex w-1/2 flex-col bg-white/[0.02]">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 py-0">
                <div className="flex items-center gap-1">
                    <span className="flex items-center gap-2 px-3 py-3 text-xs font-bold text-[#F2F4F8]">
                        <IconPencilSquare className="h-4 w-4 text-[#3B82F6]" />
                        Editor
                    </span>
                </div>
                {isTimerStarted && (
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-bold ${
                        timeRemaining <= 60
                            ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                            : "border-white/[0.08] bg-white/[0.04] text-[#C5CBD8]"
                        }`}>
                        <IconClock className="h-3.5 w-3.5" strokeWidth={2.5} />
                        {formatTime(timeRemaining)}
                    </div>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
                {!isTimerStarted ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
                        <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#A8B0C2]">
                            <IconPractice className="h-8 w-8" strokeWidth={2} />
                        </div>
                        <h3 className="mb-2 text-sm font-bold tracking-tight text-[#F2F4F8]">Ready to practice?</h3>
                        <p className="mb-8 max-w-[240px] text-xs leading-relaxed text-[#A8B0C2]">
                            You&apos;ll have <span className="font-semibold text-[#E8ECF4]">{question.estimatedTime}</span> to write your answer and receive AI feedback.
                        </p>
                        <button
                            onClick={handleStart}
                            className="group relative cursor-pointer overflow-hidden rounded-xl bg-[#3B82F6] px-8 py-3 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#4B8FF7]"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start Question
                                <IconChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={3} />
                            </span>
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="min-h-0 flex-1 bg-transparent">
                            <textarea
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                placeholder="Type your answer here…"
                                autoFocus
                                disabled={!!score}
                                className="h-full w-full resize-none bg-white/[0.02] px-6 py-6 font-mono text-sm text-[#F2F4F8] placeholder-[#6B7385] outline-none transition-colors focus:bg-white/[0.03] disabled:opacity-50"
                            />
                        </div>

                        <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-[#A8B0C2]">
                            <span>{answerText.length} characters</span>
                            <span>Ln 1, Col 1</span>
                        </div>

                        <div className="shrink-0 border-t border-white/[0.08] bg-white/[0.02]">
                            <div className="flex items-center gap-1 border-b border-white/[0.06] px-4">
                                <button
                                    onClick={() => setRightTab("answer")}
                                    className={`relative cursor-pointer px-4 py-2 text-xs font-bold transition-all ${
                                        rightTab === "answer"
                                            ? "text-[#F2F4F8]"
                                            : "text-[#A8B0C2] hover:text-[#C5CBD8]"
                                    }`}
                                >
                                    📝 Submit
                                    {rightTab === "answer" && (
                                        <div className="absolute bottom-0 left-0 right-0 mx-2 h-0.5 rounded-full bg-[#3B82F6]" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setRightTab("result")}
                                    className={`relative cursor-pointer px-4 py-2 text-xs font-bold transition-all ${
                                        rightTab === "result"
                                            ? "text-[#F2F4F8]"
                                            : "text-[#A8B0C2] hover:text-[#C5CBD8]"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <IconChartBars className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        Result
                                    </span>
                                    {rightTab === "result" && (
                                        <div className="absolute bottom-0 left-0 right-0 mx-2 h-0.5 rounded-full bg-[#3B82F6]" />
                                    )}
                                </button>
                            </div>

                            <div className="h-35 overflow-y-auto px-5 py-3">
                                {rightTab === "answer" ? (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!answerText.trim() || !!score}
                                            className="rounded-xl bg-[#3B82F6] px-6 py-2.5 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#4B8FF7] disabled:opacity-40 disabled:hover:translate-y-0"
                                        >
                                            Submit Answer
                                        </button>
                                        {score?.state === "completed" && (
                                            <button
                                                onClick={handleStart}
                                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-2.5 text-xs font-bold text-[#C5CBD8] transition-all hover:-translate-y-0.5 hover:bg-white/[0.05] hover:text-[#E8ECF4]"
                                            >
                                                Try Again
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {!score ? (
                                            <p className="py-4 text-center text-sm text-[#A8B0C2]">Submit your answer first.</p>
                                        ) : score.state === "evaluating" ? (
                                            <div className="flex items-center justify-center gap-3 py-6 text-sm font-bold text-[#93C5FD]">
                                                <IconSpinner className="h-5 w-5 animate-spin" />
                                                Analyzing your response…
                                            </div>
                                        ) : (
                                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-500">
                                                <div className="flex items-center gap-4">
                                                    <div className={`text-2xl font-black ${score.score >= 70 ? "text-sky-400" : "text-amber-400"}`}>
                                                        {score.score}%
                                                    </div>
                                                    <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${score.score >= 70
                                                        ? "border-sky-500/20 bg-sky-500/10 text-sky-300"
                                                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                                                        }`}>
                                                        {score.score >= 70 ? "Excellent" : "Needs Review"}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium leading-relaxed text-[#C5CBD8]">{score.feedback}</p>
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
