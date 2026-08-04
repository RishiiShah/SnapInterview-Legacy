"use client";

import Link from "next/link";
import { CATEGORIES } from "@/data/constants";
import type { Difficulty, QuestionCategory, Question } from "@/data/types";

type SortKey = "category" | "difficulty" | "time";
type SortDir = "asc" | "desc";

function renderSortIcon(col: SortKey, sortKey: SortKey | null, sortDir: SortDir) {
  if (sortKey !== col) {
    return (
      <svg className="ml-1 inline h-3 w-3 text-[#6B7385]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    );
  }
  return sortDir === "asc" ? (
    <svg className="ml-1 inline h-3 w-3 text-[#93C5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  ) : (
    <svg className="ml-1 inline h-3 w-3 text-[#93C5FD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

type QuestionsTableProps = {
  filtered: Question[];
  totalQuestions: number;
  setSearch: (value: string) => void;
  setSelectedCategory: (value: QuestionCategory | "all") => void;
  setSelectedDifficulty: (value: Difficulty | "all") => void;
  sortKey: SortKey | null;
  sortDir: SortDir;
  toggleSort: (key: SortKey) => void;
  basePath?: "/questions" | "/coding";
  hideCategoryColumn?: boolean;
};

export default function QuestionsTable({
  filtered,
  totalQuestions,
  setSearch,
  setSelectedCategory,
  setSelectedDifficulty,
  sortKey,
  sortDir,
  toggleSort,
  basePath = "/questions",
  hideCategoryColumn = false,
}: QuestionsTableProps) {
  const difficultyLabel = (d: Difficulty) => {
    const map: Record<Difficulty, { text: string; color: string }> = {
      easy: { text: "Easy", color: "text-sky-400" },
      medium: { text: "Medium", color: "text-amber-400" },
      hard: { text: "Hard", color: "text-rose-400" },
    };
    return map[d];
  };

  const categoryLabel = (cat: QuestionCategory) => CATEGORIES.find((c) => c.value === cat);
  const gridCols = hideCategoryColumn
    ? "grid-cols-[3rem_minmax(0,1fr)_6.5rem_5.5rem]"
    : "grid-cols-[3rem_minmax(0,1fr)_9rem_6.5rem_5.5rem]";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141A]/90 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
      <div
        className={`grid ${gridCols} items-center border-b border-white/[0.07] bg-black/[0.14] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7385]`}
      >
        <span>#</span>
        <span>Title</span>
        {!hideCategoryColumn ? (
          <button
            type="button"
            onClick={() => toggleSort("category")}
            className="flex cursor-pointer items-center text-left transition-colors hover:text-[#E8ECF4]"
          >
            Category
            {renderSortIcon("category", sortKey, sortDir)}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => toggleSort("difficulty")}
          className="flex cursor-pointer items-center text-left transition-colors hover:text-[#E8ECF4]"
        >
          Difficulty
          {renderSortIcon("difficulty", sortKey, sortDir)}
        </button>
        <button
          type="button"
          onClick={() => toggleSort("time")}
          className="flex cursor-pointer items-center justify-end transition-colors hover:text-[#E8ECF4]"
        >
          Time
          {renderSortIcon("time", sortKey, sortDir)}
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="divide-y divide-white/[0.05]">
          {filtered.map((q) => {
            const diff = difficultyLabel(q.difficulty);
            const cat = categoryLabel(q.category);

            return (
              <Link
                key={q.id}
                href={`${basePath}/${q.slug}`}
                className={`group grid ${gridCols} items-center px-5 py-4 transition-colors hover:bg-[#3B82F6]/[0.06]`}
              >
                <span className="font-mono text-xs text-[#6B7385]">{String(q.id).padStart(2, "0")}</span>
                <span className="line-clamp-1 pr-4 text-sm font-medium text-[#DCE3F0] transition-colors group-hover:text-white">
                  {q.text}
                </span>
                {!hideCategoryColumn ? (
                  <span className="text-xs font-medium text-[#A8B0C2]">
                    {cat?.label}
                  </span>
                ) : null}
                <span className={`text-xs font-semibold ${diff.color}`}>{diff.text}</span>
                <span className="text-right text-xs font-medium tabular-nums text-[#A8B0C2]">{q.estimatedTime}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-[#A8B0C2]">No questions match your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedCategory(hideCategoryColumn ? "coding" : "all");
              setSelectedDifficulty("all");
            }}
            className="mt-2 text-sm font-medium text-[#93C5FD] hover:text-[#BFDBFE]"
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="sr-only">Total questions: {totalQuestions}</div>
    </div>
  );
}
