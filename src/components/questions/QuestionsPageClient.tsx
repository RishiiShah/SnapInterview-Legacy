"use client";

import { useState, useMemo } from "react";

import { CATEGORIES } from "@/data/constants";
import type { Difficulty, Question, QuestionCategory } from "@/data/types";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import QuestionsFilterBar from "@/components/questions/QuestionsFilterBar";
import QuestionsTable from "@/components/questions/QuestionsTable";

type SortKey = "category" | "difficulty" | "time";
type SortDir = "asc" | "desc";
type QuestionsVariant = "interview" | "coding";

type QuestionsPageClientProps = {
  initialSolvedIds: number[];
  questions: Question[];
  variant?: QuestionsVariant;
};

const DIFFICULTY_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const CATEGORY_ORDER: Record<QuestionCategory, number> = {
  behavioral: 0,
  technical: 1,
  "system-design": 2,
  leadership: 3,
  coding: 4,
};

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

export default function QuestionsPageClient({
  initialSolvedIds,
  questions,
  variant = "interview",
}: QuestionsPageClientProps) {
  const isCoding = variant === "coding";
  const filterCategories = isCoding
    ? CATEGORIES.filter((c) => c.value === "coding")
    : CATEGORIES.filter((c) => c.value !== "coding");

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | "all">(
    isCoding ? "coding" : "all",
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);

  const solvedIds = useMemo(() => new Set(initialSolvedIds), [initialSolvedIds]);
  const solvedCount = useMemo(
    () => questions.filter((q) => solvedIds.has(q.id)).length,
    [questions, solvedIds],
  );

  const activeFilterCount =
    (selectedCategory !== "all" && !(isCoding && selectedCategory === "coding") ? 1 : 0) +
    (selectedDifficulty !== "all" ? 1 : 0);

  const filtered = useMemo(() => {
    let result = questions.filter((q) => {
      if (selectedCategory !== "all" && q.category !== selectedCategory) return false;
      if (selectedDifficulty !== "all" && q.difficulty !== selectedDifficulty) return false;
      if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortKey) result = [...result].sort((a, b) => compareFn(a, b, sortKey, sortDir));
    return result;
  }, [search, selectedCategory, selectedDifficulty, sortKey, sortDir, questions]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const stats = filterCategories.map((cat) => ({
    ...cat,
    count: questions.filter((q) => q.category === cat.value).length,
  }));

  return (
    <div className="space-y-5 pb-8">
      <SlideIn>
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12141A]/90 px-5 py-5 sm:px-6">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{ background: "radial-gradient(ellipse 70% 120% at 100% 0%, rgba(59,130,246,0.12), transparent 64%)" }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#93C5FD]">Practice library</p>
              <h1 className="mt-1.5 font-display text-2xl tracking-tight text-[#F2F4F8] sm:text-[1.85rem]">
                {isCoding ? "Coding" : "Question Bank"}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-[#A8B0C2]">
                {isCoding
                  ? "Work through focused problems and build a consistent solving rhythm."
                  : "Build sharper interview stories across the areas that matter most."}
              </p>
            </div>
            <div className="flex gap-5 sm:gap-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7385]">Available</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-[#F2F4F8]">{questions.length}</p>
              </div>
              <div className="border-l border-white/[0.08] pl-5 sm:pl-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7385]">Solved</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-400">{solvedCount}</p>
              </div>
              {!isCoding ? <div className="hidden border-l border-white/[0.08] pl-7 sm:block"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7385]">Focus areas</p><p className="mt-1 text-xl font-semibold tabular-nums text-[#F2F4F8]">{filterCategories.length}</p></div> : null}
            </div>
          </div>
        </section>
      </SlideIn>

      <FadeIn delay={0.1} direction="up" className="relative z-30">
        <QuestionsFilterBar
          search={search}
          setSearch={setSearch}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          activeFilterCount={activeFilterCount}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedDifficulty={selectedDifficulty}
          setSelectedDifficulty={setSelectedDifficulty}
          stats={stats}
          hideCategoryFilter={isCoding}
        />
      </FadeIn>

      <FadeIn delay={0.25} direction="up" className="relative z-10">
        <p className="text-xs text-[#A8B0C2]">
          Showing {filtered.length} of {questions.length}{" "}
          {isCoding ? "problem" : "question"}
          {filtered.length !== 1 ? "s" : ""}
        </p>
      </FadeIn>

      <FadeIn delay={0.3} direction="up" className="relative z-0">
        <QuestionsTable
          filtered={filtered}
          totalQuestions={questions.length}
          setSearch={setSearch}
          setSelectedCategory={setSelectedCategory}
          setSelectedDifficulty={setSelectedDifficulty}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
          basePath={isCoding ? "/coding" : "/questions"}
          hideCategoryColumn={isCoding}
        />
      </FadeIn>
    </div>
  );
}
