"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { CATEGORIES, DIFFICULTIES } from "@/data/constants";
import { QUESTIONS } from "@/data/questions";
import type { InterviewType, Difficulty, Question } from "@/data/types";
import { FadeIn, SlideIn } from "@/components/ui/motion";

type SortKey = "category" | "difficulty" | "time";
type SortDir = "asc" | "desc";

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const CATEGORY_ORDER: Record<InterviewType, number> = { behavioral: 0, technical: 1, "system-design": 2, leadership: 3 };

function getMinutes(t: string): number {
  const m = t.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function compareFn(a: Question, b: Question, key: SortKey, dir: SortDir): number {
  let cmp = 0;
  if (key === "difficulty") cmp = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
  else if (key === "category") cmp = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  else if (key === "time") cmp = getMinutes(a.estimatedTime) - getMinutes(b.estimatedTime);
  return dir === "asc" ? cmp : -cmp;
}

export default function QuestionsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<InterviewType | "all">("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [solvedCount, setSolvedCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  /* ── Load solved count from localStorage ── */
  useEffect(() => {
    try {
      const solved = JSON.parse(localStorage.getItem("solvedQuestions") || "[]");
      if (Array.isArray(solved)) setSolvedCount(solved.length);
    } catch { /* ignore */ }
  }, []);

  /* ── Close filter dropdown on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeFilterCount = (selectedCategory !== "all" ? 1 : 0) + (selectedDifficulty !== "all" ? 1 : 0);

  /* ── Filtering + Sorting ── */
  const filtered = useMemo(() => {
    let result = QUESTIONS.filter((q) => {
      if (selectedCategory !== "all" && q.category !== selectedCategory) return false;
      if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;
      if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortKey) {
      result = [...result].sort((a, b) => compareFn(a, b, sortKey, sortDir));
    }
    return result;
  }, [search, selectedCategory, selectedDifficulty, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        // desc → reset to neutral
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <svg className="ml-1 inline h-3 w-3 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>;
    return sortDir === "asc"
      ? <svg className="ml-1 inline h-3 w-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
      : <svg className="ml-1 inline h-3 w-3 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
  };

  /* ── Stats ── */
  const stats = CATEGORIES.map((cat) => ({
    ...cat,
    count: QUESTIONS.filter((q) => q.category === cat.value).length,
  }));

  /* ── Helpers ── */
  const difficultyLabel = (d: Difficulty) => {
    const map: Record<Difficulty, { text: string; color: string }> = {
      easy: { text: "Easy", color: "text-emerald-600" },
      medium: { text: "Medium", color: "text-amber-600" },
      hard: { text: "Hard", color: "text-red-500" },
    };
    return map[d];
  };

  const categoryLabel = (cat: InterviewType) =>
    CATEGORIES.find((c) => c.value === cat);

  return (
    <DashboardShell>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <SlideIn>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Question Bank</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {QUESTIONS.length} questions across {CATEGORIES.length} categories
              </p>
            </div>
          </div>
        </SlideIn>

        {/* Filters row — z-10 ensures dropdown renders above table below */}
        <div className="relative z-10">
          <FadeIn delay={0.1} direction="up">
            <div className="flex flex-wrap items-center gap-3 px-[1%]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
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

              {/* Progress */}
              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
                <div className="h-2 w-20 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${QUESTIONS.length > 0 ? (solvedCount / QUESTIONS.length) * 100 : 0}%`,
                      backgroundColor: solvedCount === 0 ? "#e4e4e7" : solvedCount === QUESTIONS.length ? "#10b981" : "#3b82f6",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-zinc-900 whitespace-nowrap">
                  {solvedCount}<span className="text-zinc-400 font-normal">/{QUESTIONS.length}</span>
                  <span className="ml-1 text-xs font-normal text-zinc-400">Solved</span>
                </span>
              </div>

              {/* Filter button + dropdown */}
              <div ref={filterRef} className="relative z-20">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${showFilters
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:shadow-sm"
                    }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${showFilters ? "bg-white text-zinc-900" : "bg-blue-500 text-white"
                      }`}>
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Dropdown panel */}
                {showFilters && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
                    {/* Category */}
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
                            className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedCategory === s.value
                              ? "bg-zinc-900 text-white shadow-sm"
                              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                              }`}
                          >
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedCategory === s.value ? "bg-white/60" : s.color.split(" ")[0]}`} />
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-4 border-t border-zinc-100" />

                    {/* Difficulty */}
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

                    {/* Clear all */}
                    {activeFilterCount > 0 && (
                      <>
                        <div className="my-4 border-t border-zinc-100" />
                        <button
                          onClick={() => { setSelectedCategory("all"); setSelectedDifficulty("all"); }}
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
          </FadeIn>
        </div>

        {/* Results count */}
        <FadeIn delay={0.25} direction="up">
          <p className="text-xs text-zinc-400">
            Showing {filtered.length} of {QUESTIONS.length} question{filtered.length !== 1 ? "s" : ""}
          </p>
        </FadeIn>

        {/* ── Table ── */}
        <FadeIn delay={0.3} direction="up">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {/* Table header */}
            <div className="grid grid-cols-[48px_1fr_140px_100px_80px] items-center border-b border-zinc-100 bg-zinc-50/60 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span>#</span>
              <span>Title</span>
              <button onClick={() => toggleSort("category")} className="flex cursor-pointer items-center text-left hover:text-zinc-900 transition-colors">
                Category<SortIcon col="category" />
              </button>
              <button onClick={() => toggleSort("difficulty")} className="flex cursor-pointer items-center text-left hover:text-zinc-900 transition-colors">
                Difficulty<SortIcon col="difficulty" />
              </button>
              <button onClick={() => toggleSort("time")} className="flex cursor-pointer items-center justify-end hover:text-zinc-900 transition-colors">
                Time<SortIcon col="time" />
              </button>
            </div>

            {/* Rows */}
            {filtered.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {filtered.map((q) => {
                  const diff = difficultyLabel(q.difficulty);
                  const cat = categoryLabel(q.category);

                  return (
                    <Link
                      key={q.id}
                      href={`/questions/${q.slug}`}
                      className="grid grid-cols-[48px_1fr_140px_100px_80px] items-center px-4 py-3.5 transition-colors hover:bg-zinc-50 group"
                    >
                      {/* Number */}
                      <span className="text-sm font-medium text-zinc-400">
                        {q.id}
                      </span>

                      {/* Title */}
                      <span className="pr-4 text-sm font-medium text-zinc-900 group-hover:text-zinc-700 line-clamp-1">
                        {q.text}
                      </span>

                      {/* Category */}
                      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cat?.color || ""}`}>
                        {cat?.label}
                      </span>

                      {/* Difficulty */}
                      <span className={`text-sm font-medium ${diff.color}`}>
                        {diff.text}
                      </span>

                      {/* Time */}
                      <span className="text-right text-sm text-zinc-400">
                        {q.estimatedTime}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-zinc-400">No questions match your filters.</p>
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
          </div>
        </FadeIn>
      </div>
    </DashboardShell>
  );
}
