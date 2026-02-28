"use client";

import { useEffect, useRef } from "react";
import { DIFFICULTIES } from "@/data/constants";
import type { Difficulty, InterviewType } from "@/data/types";

type CategoryStat = {
  value: InterviewType;
  label: string;
  color: string;
  count: number;
};

type QuestionsFilterBarProps = {
  search: string;
  setSearch: (value: string) => void;
  solvedCount: number;
  totalQuestions: number;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  activeFilterCount: number;
  selectedCategory: InterviewType | "all";
  setSelectedCategory: (value: InterviewType | "all") => void;
  selectedDifficulty: Difficulty | "all";
  setSelectedDifficulty: (value: Difficulty | "all") => void;
  stats: CategoryStat[];
};

export default function QuestionsFilterBar({
  search,
  setSearch,
  solvedCount,
  totalQuestions,
  showFilters,
  setShowFilters,
  activeFilterCount,
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  stats,
}: QuestionsFilterBarProps) {
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [setShowFilters]);

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-3 px-[1%]">
        <div className="relative min-w-[200px] flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          />
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
          <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalQuestions > 0 ? (solvedCount / totalQuestions) * 100 : 0}%`,
                backgroundColor: solvedCount === 0 ? "#e4e4e7" : solvedCount === totalQuestions ? "#10b981" : "#3b82f6",
              }}
            />
          </div>
          <span className="whitespace-nowrap text-sm font-semibold text-zinc-900">
            {solvedCount}
            <span className="font-normal text-zinc-400">/{totalQuestions}</span>
            <span className="ml-1 text-xs font-normal text-zinc-400">Solved</span>
          </span>
        </div>

        <div ref={filterRef} className="relative z-10">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              showFilters ? "border-zinc-900 bg-zinc-900 text-white shadow-sm" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:shadow-sm"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${showFilters ? "bg-white text-zinc-900" : "bg-blue-500 text-white"}`}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Category</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedCategory === "all" ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                  >
                    All
                  </button>
                  {stats.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSelectedCategory(s.value)}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedCategory === s.value ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedCategory === s.value ? "bg-white/60" : s.color.split(" ")[0]}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-4 border-t border-zinc-100" />

              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Difficulty</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedDifficulty("all")}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedDifficulty === "all" ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                  >
                    All
                  </button>
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDifficulty(d.value)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedDifficulty === d.value ? "bg-zinc-900 text-white shadow-sm" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <>
                  <div className="my-4 border-t border-zinc-100" />
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedDifficulty("all");
                    }}
                    className="w-full cursor-pointer rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-50"
                  >
                    Clear All Filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
