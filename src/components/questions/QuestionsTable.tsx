"use client";

import Link from "next/link";
import { CATEGORIES } from "@/data/constants";
import type { Difficulty, QuestionCategory, Question } from "@/data/types";

type SortKey = "category" | "difficulty" | "time";
type SortDir = "asc" | "desc";

const CATEGORY_DARK: Record<QuestionCategory, string> = {
  behavioral: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  technical: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  "system-design": "bg-amber-500/10 text-amber-300 border-amber-500/20",
  leadership: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  coding: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
};

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

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="grid grid-cols-[48px_1fr_140px_100px_80px] items-center border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#A8B0C2]">
        <span>#</span>
        <span>Title</span>
        <button
          onClick={() => toggleSort("category")}
          className="flex cursor-pointer items-center text-left transition-colors hover:text-[#E8ECF4]"
        >
          Category
          {renderSortIcon("category", sortKey, sortDir)}
        </button>
        <button
          onClick={() => toggleSort("difficulty")}
          className="flex cursor-pointer items-center text-left transition-colors hover:text-[#E8ECF4]"
        >
          Difficulty
          {renderSortIcon("difficulty", sortKey, sortDir)}
        </button>
        <button
          onClick={() => toggleSort("time")}
          className="flex cursor-pointer items-center justify-end transition-colors hover:text-[#E8ECF4]"
        >
          Time
          {renderSortIcon("time", sortKey, sortDir)}
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="divide-y divide-white/[0.06]">
          {filtered.map((q) => {
            const diff = difficultyLabel(q.difficulty);
            const cat = categoryLabel(q.category);

            return (
              <Link
                key={q.id}
                href={`/questions/${q.slug}`}
                className="group grid grid-cols-[48px_1fr_140px_100px_80px] items-center px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
              >
                <span className="text-sm font-medium text-[#A8B0C2]">{q.id}</span>
                <span className="line-clamp-1 pr-4 text-sm font-medium text-[#E8ECF4] group-hover:text-[#F2F4F8]">
                  {q.text}
                </span>
                <span
                  className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                    CATEGORY_DARK[q.category] ?? "bg-white/[0.04] text-[#B0B8C8] border-white/[0.08]"
                  }`}
                >
                  {q.type === "coding" && <span className="font-bold">{"</>"}</span>}
                  {cat?.label}
                </span>
                <span className={`text-sm font-medium ${diff.color}`}>{diff.text}</span>
                <span className="text-right text-sm text-[#A8B0C2]">{q.estimatedTime}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-[#A8B0C2]">No questions match your filters.</p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
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
