"use client";

import { useEffect, useRef } from "react";
import { DIFFICULTIES } from "@/data/constants";
import type { Difficulty, QuestionCategory } from "@/data/types";

type CategoryStat = {
  value: QuestionCategory;
  label: string;
  color: string;
  count: number;
};

type QuestionsFilterBarProps = {
  search: string;
  setSearch: (value: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  activeFilterCount: number;
  selectedCategory: QuestionCategory | "all";
  setSelectedCategory: (value: QuestionCategory | "all") => void;
  selectedDifficulty: Difficulty | "all";
  setSelectedDifficulty: (value: Difficulty | "all") => void;
  stats: CategoryStat[];
};

const CHIP_IDLE =
  "border border-white/[0.08] bg-white/[0.02] text-[#C5CBD8] hover:bg-white/[0.05] hover:text-[#E8ECF4]";
const CHIP_ACTIVE = "bg-[#3B82F6]/15 text-[#93C5FD] border border-[#3B82F6]/25";

export default function QuestionsFilterBar({
  search,
  setSearch,
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
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#12141A]/80 p-2.5">
        <div className="relative min-w-[200px] flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8B0C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="w-full rounded-xl border border-transparent bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-[#F2F4F8] placeholder-[#6B7385] outline-none transition-all hover:bg-white/[0.06] focus:border-[#3B82F6]/35 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#3B82F6]/15"
          />
        </div>

        <div ref={filterRef} className="relative z-10">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#3B82F6]/35 ${
              showFilters
                ? "border-[#3B82F6]/30 bg-[#3B82F6]/15 text-[#93C5FD]"
                : "border-white/[0.1] bg-white/[0.03] text-[#C5CBD8] hover:bg-white/[0.05] hover:text-[#E8ECF4]"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  showFilters ? "bg-white/20 text-[#F2F4F8]" : "bg-[#3B82F6] text-white"
                }`}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {showFilters && (
            <div
              className="absolute right-0 top-full z-20 mt-2 w-80 rounded-2xl border border-white/[0.1] bg-[#12141A] p-5 shadow-xl"
              style={{ animation: "fadeSlideIn 0.15s ease-out" }}
            >
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8B0C2]">
                  Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("all")}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedCategory === "all" ? CHIP_ACTIVE : CHIP_IDLE
                    }`}
                  >
                    All
                  </button>
                  {stats.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSelectedCategory(s.value)}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedCategory === s.value ? CHIP_ACTIVE : CHIP_IDLE
                      }`}
                    >
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          selectedCategory === s.value ? "bg-[#93C5FD]" : "bg-[#3B82F6]/60"
                        }`}
                      />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="my-4 border-t border-white/[0.06]" />

              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#A8B0C2]">Difficulty</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDifficulty("all")}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedDifficulty === "all" ? CHIP_ACTIVE : CHIP_IDLE
                    }`}
                  >
                    All
                  </button>
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setSelectedDifficulty(d.value)}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        selectedDifficulty === d.value ? CHIP_ACTIVE : CHIP_IDLE
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <>
                  <div className="my-4 border-t border-white/[0.06]" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedDifficulty("all");
                    }}
                    className="w-full cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs font-medium text-[#C5CBD8] transition-all hover:bg-white/[0.05] hover:text-[#E8ECF4]"
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
