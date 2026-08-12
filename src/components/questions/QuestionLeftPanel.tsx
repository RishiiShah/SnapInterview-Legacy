"use client";

import type { ReactNode } from "react";
import { CATEGORIES } from "@/data/constants";
import type { Question, Difficulty, QuestionCategory } from "@/data/types";
import {
  IconAcademicCap,
  IconCheckCircle,
  IconChevronDown,
  IconLightBulb,
  IconTag,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export type LeftTab = "description" | "solutions";

interface QuestionLeftPanelProps {
  question: Question;
  leftTab: LeftTab;
  setLeftTab: (tab: LeftTab) => void;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  showTopics: boolean;
  setShowTopics: (v: boolean) => void;
  showSample: boolean;
  setShowSample: (v: boolean) => void;
  isSolved: boolean;
  isSolveUpdating: boolean;
  solveError: string | null;
  handleToggleSolved: () => void;
  /** Controlled width when used inside a horizontal resizable split. */
  widthPercent?: number;
}

const diffLabel = (d: Difficulty) =>
  ({ easy: "Easy", medium: "Medium", hard: "Hard" })[d];
const catInfo = (c: QuestionCategory) => CATEGORIES.find((x) => x.value === c);

const DIFF_PILL: Record<Difficulty, string> = {
  easy: "bg-emerald-500/10 text-emerald-300",
  medium: "bg-amber-500/10 text-amber-300",
  hard: "bg-rose-500/10 text-rose-300",
};

function MetaPill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none",
        active
          ? "bg-white/[0.1] text-[#F2F4F8]"
          : "bg-white/[0.05] text-[#C5CBD8] hover:bg-white/[0.08] hover:text-[#E8ECF4]",
      )}
    >
      {children}
    </button>
  );
}

export function QuestionLeftPanel({
  question,
  leftTab,
  setLeftTab,
  showHint,
  setShowHint,
  showTopics,
  setShowTopics,
  showSample,
  setShowSample,
  isSolved,
  isSolveUpdating,
  solveError,
  handleToggleSolved,
  widthPercent,
}: QuestionLeftPanelProps) {
  return (
    <div
      className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A]/90"
      style={widthPercent != null ? { width: `${widthPercent}%` } : { width: "42%" }}
    >
      <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-white/[0.06] px-3">
        {(["description", "solutions"] as LeftTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setLeftTab(tab)}
            className={cn(
              "relative cursor-pointer px-3 py-2 text-xs font-medium capitalize transition-colors focus:outline-none",
              leftTab === tab ? "text-[#F2F4F8]" : "text-[#A8B0C2] hover:text-[#C5CBD8]",
            )}
          >
            {tab === "description" ? "Description" : "Solutions"}
            {leftTab === tab ? (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#3B82F6]" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {leftTab === "description" ? (
          <div className="space-y-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-[1.35rem] font-semibold leading-snug tracking-tight text-[#F2F4F8]">
                  {question.id}. {question.text}
                </h1>
                {isSolved ? (
                  <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-400">
                    <IconCheckCircle className="h-3.5 w-3.5" />
                    Solved
                  </span>
                ) : null}
              </div>

            </div>

            <div className="space-y-3 text-[15px] leading-relaxed text-[#D5DBE8]">
              <p>
                Prepare a structured response. Lead with the situation, your actions, and the
                outcome, then tie it back to the competency this question probes.
              </p>
              <p className="text-sm text-[#A8B0C2]">
                Use the timer on the right to rehearse under interview pressure. Hints and a
                sample answer are available below when you need a nudge.
              </p>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                    DIFF_PILL[question.difficulty],
                  )}
                >
                  {diffLabel(question.difficulty)}
                </span>
                <MetaPill active={showTopics} onClick={() => setShowTopics(!showTopics)}>
                  <IconTag className="h-3.5 w-3.5" />
                  Topics
                  <IconChevronDown
                    className={cn("h-3 w-3 transition-transform", showTopics && "rotate-180")}
                  />
                </MetaPill>
                {question.hint ? (
                  <MetaPill active={showHint} onClick={() => setShowHint(!showHint)}>
                    <IconLightBulb className="h-3.5 w-3.5 text-amber-400" />
                    Hint
                  </MetaPill>
                ) : null}
                {question.sampleAnswer ? (
                  <MetaPill active={showSample} onClick={() => setShowSample(!showSample)}>
                    <IconAcademicCap className="h-3.5 w-3.5" />
                    Sample
                  </MetaPill>
                ) : null}
              </div>

              {showTopics ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {question.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-medium text-[#C5CBD8]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {showHint && question.hint ? (
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-3 text-sm leading-relaxed text-[#E8ECF4]">
                  {question.hint}
                </div>
              ) : null}

              {showSample && question.sampleAnswer ? (
                <div className="mt-3 rounded-lg border border-[#3B82F6]/20 bg-[#3B82F6]/10 px-3.5 py-3 text-sm leading-relaxed text-[#E8ECF4]">
                  {question.sampleAnswer}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/[0.06] pt-4 text-xs text-[#A8B0C2]">
              <span>
                <span className="text-[#6B7385]">Category</span>{" "}
                <span className="font-medium text-[#C5CBD8]">
                  {catInfo(question.category)?.label}
                </span>
              </span>
              <span>
                <span className="text-[#6B7385]">Time</span>{" "}
                <span className="font-medium text-[#C5CBD8]">{question.estimatedTime}</span>
              </span>
            </div>

            <div>
              <button
                type="button"
                onClick={() => handleToggleSolved()}
                disabled={isSolveUpdating}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                  isSolved
                    ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                    : "bg-white/[0.05] text-[#C5CBD8] hover:bg-white/[0.08] hover:text-[#E8ECF4]",
                )}
              >
                <IconCheckCircle className="h-3.5 w-3.5" />
                {isSolveUpdating ? "Updating..." : isSolved ? "Solved" : "Mark as Solved"}
              </button>
              {solveError ? <p className="mt-2 text-xs text-rose-400">{solveError}</p> : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] text-[#A8B0C2]">
              <IconLightBulb className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-[#F2F4F8]">Community solutions coming soon.</p>
            <p className="mt-2 max-w-[240px] text-xs leading-relaxed text-[#A8B0C2]">
              Practice this question and build your own approach to share with others.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
