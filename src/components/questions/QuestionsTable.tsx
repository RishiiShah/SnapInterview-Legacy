"use client";

import Link from "next/link";
import { CATEGORIES } from "@/data/constants";
import type { Difficulty, QuestionCategory, Question } from "@/data/types";

type SortKey = "category" | "difficulty" | "time";
type SortDir = "asc" | "desc";

function renderSortIcon(col: SortKey, sortKey: SortKey | null, sortDir: SortDir) {
  if (sortKey !== col) {
    return (
      <svg className="ml-1 inline h-3 w-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    );
  }
  return sortDir === "asc" ? (
    <svg className="ml-1 inline h-3 w-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  ) : (
    <svg className="ml-1 inline h-3 w-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      easy: { text: "Easy", color: "text-sky-500" },
      medium: { text: "Medium", color: "text-amber-600" },
      hard: { text: "Hard", color: "text-red-500" },
    };
    return map[d];
  };

  const categoryLabel = (cat: QuestionCategory) => CATEGORIES.find((c) => c.value === cat);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="grid grid-cols-[48px_1fr_140px_100px_80px] items-center border-b border-zinc-100 bg-zinc-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
        <span>#</span>
        <span>Title</span>
        <button onClick={() => toggleSort("category")} className="flex cursor-pointer items-center text-left transition-colors hover:text-zinc-900">
          Category
          {renderSortIcon("category", sortKey, sortDir)}
        </button>
        <button onClick={() => toggleSort("difficulty")} className="flex cursor-pointer items-center text-left transition-colors hover:text-zinc-900">
          Difficulty
          {renderSortIcon("difficulty", sortKey, sortDir)}
        </button>
        <button onClick={() => toggleSort("time")} className="flex cursor-pointer items-center justify-end transition-colors hover:text-zinc-900">
          Time
          {renderSortIcon("time", sortKey, sortDir)}
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="divide-y divide-zinc-100">
          {filtered.map((q) => {
            const diff = difficultyLabel(q.difficulty);
            const cat = categoryLabel(q.category);

            return (
              <Link key={q.id} href={`/questions/${q.slug}`} className="group grid grid-cols-[48px_1fr_140px_100px_80px] items-center px-4 py-3.5 transition-colors hover:bg-zinc-50">
                <span className="text-sm font-medium text-zinc-600">{q.id}</span>
                <span className="line-clamp-1 pr-4 text-sm font-medium text-zinc-900 group-hover:text-zinc-700">{q.text}</span>
                <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cat?.color || ""}`}>
                  {q.type === "coding" && <span className="font-bold">{"</>"}</span>}
                  {cat?.label}
                </span>
                <span className={`text-sm font-medium ${diff.color}`}>{diff.text}</span>
                <span className="text-right text-sm text-zinc-600">{q.estimatedTime}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-600">No questions match your filters.</p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
              setSelectedDifficulty("all");
            }}
            className="mt-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="sr-only">Total questions: {totalQuestions}</div>
    </div>
  );
}
