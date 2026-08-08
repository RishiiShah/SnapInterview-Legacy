"use client";

import type { Question } from "@/data/types";
import {
  IconChartBars,
  IconCheckCircle,
  IconChevronRight,
  IconClock,
  IconPencilSquare,
  IconPractice,
  IconSpinner,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

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

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

export function QuestionRightPanel({
  question,
  answerText,
  setAnswerText,
  timeRemaining,
  isTimerStarted,
  score,
  rightTab,
  setRightTab,
  handleStart,
  handleSubmit,
}: QuestionRightPanelProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
        <span className="inline-flex items-center gap-2 px-1 text-xs font-medium text-[#F2F4F8]">
          <IconPencilSquare className="h-4 w-4 text-[#3B82F6]" />
          Answer
        </span>
        {isTimerStarted ? (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium tabular-nums",
              timeRemaining <= 60
                ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                : "border-white/[0.08] bg-white/[0.04] text-[#C5CBD8]",
            )}
          >
            <IconClock className="h-3.5 w-3.5" />
            {formatTime(timeRemaining)}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {!isTimerStarted ? (
          <div className="flex flex-1 flex-col items-center justify-center px-10 text-center">
            <div className="mb-5 grid h-14 w-14 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#A8B0C2]">
              <IconPractice className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-sm font-semibold tracking-tight text-[#F2F4F8]">
              Ready to practice?
            </h3>
            <p className="mb-7 max-w-[260px] text-xs leading-relaxed text-[#A8B0C2]">
              You&apos;ll have{" "}
              <span className="font-medium text-[#E8ECF4]">{question.estimatedTime}</span> to write
              your answer and receive AI feedback.
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#4B8FF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
            >
              Start Question
              <IconChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1">
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer here…"
                autoFocus
                disabled={!!score}
                className="h-full w-full resize-none bg-transparent px-5 py-5 text-sm leading-relaxed text-[#F2F4F8] placeholder-[#6B7385] outline-none disabled:opacity-50"
              />
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-4 py-1.5 text-[11px] text-[#A8B0C2]">
              <span>{answerText.length} characters</span>
              {score?.state === "evaluating" ? (
                <span className="inline-flex items-center gap-1.5 text-[#93C5FD]">
                  <IconSpinner className="h-3 w-3 animate-spin" />
                  Evaluating…
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col border-t border-white/[0.06] bg-white/[0.02]">
              <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setRightTab("answer")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
                      rightTab === "answer"
                        ? "text-[#F2F4F8]"
                        : "text-[#A8B0C2] hover:text-[#C5CBD8]",
                    )}
                  >
                    <IconCheckCircle
                      className={cn(
                        "h-4 w-4",
                        rightTab === "answer" ? "text-emerald-400" : "text-[#6B7385]",
                      )}
                    />
                    Submit
                  </button>
                  <span className="mx-1 h-4 w-px bg-white/[0.1]" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setRightTab("result")}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50",
                      rightTab === "result"
                        ? "text-[#F2F4F8]"
                        : "text-[#A8B0C2] hover:text-[#C5CBD8]",
                    )}
                  >
                    <IconChartBars
                      className={cn(
                        "h-4 w-4",
                        rightTab === "result" ? "text-[#C5CBD8]" : "text-[#6B7385]",
                      )}
                    />
                    Result
                  </button>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {rightTab === "answer" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!answerText.trim() || !!score}
                      className="inline-flex cursor-pointer items-center rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Submit Answer
                    </button>
                    {score?.state === "completed" ? (
                      <button
                        type="button"
                        onClick={handleStart}
                        className="inline-flex cursor-pointer items-center rounded-md bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-[#E8ECF4] transition-colors hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50"
                      >
                        Try Again
                      </button>
                    ) : null}
                  </div>
                ) : !score ? (
                  <p className="py-3 text-center text-sm text-[#A8B0C2]">
                    Submit your answer to see feedback.
                  </p>
                ) : score.state === "evaluating" ? (
                  <div className="flex items-center justify-center gap-2.5 py-5 text-sm font-medium text-[#93C5FD]">
                    <IconSpinner className="h-4 w-4 animate-spin" />
                    Analyzing your response…
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "font-mono text-2xl font-medium tabular-nums",
                          score.score >= 70 ? "text-emerald-400" : "text-amber-400",
                        )}
                      >
                        {score.score}%
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium",
                          score.score >= 70
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-amber-500/10 text-amber-300",
                        )}
                      >
                        {score.score >= 70 ? "Strong" : "Needs work"}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#C5CBD8]">{score.feedback}</p>
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
