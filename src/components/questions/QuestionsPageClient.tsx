"use client";

import { useState, useMemo } from "react";

import { CATEGORIES } from "@/data/constants";
import type { Difficulty, Question, QuestionCategory } from "@/data/types";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import QuestionsFilterBar from "@/components/questions/QuestionsFilterBar";
import QuestionsTable from "@/components/questions/QuestionsTable";

type SortKey = "category" | "difficulty" | "time";
type SortDir = "asc" | "desc";

type QuestionsPageClientProps = {
  initialSolvedIds: number[];
  questions: Question[];
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

export default function QuestionsPageClient({ initialSolvedIds, questions }: QuestionsPageClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | "all">("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showFilters, setShowFilters] = useState(false);

  const solvedCount = useMemo(() => new Set(initialSolvedIds).size, [initialSolvedIds]);

  const activeFilterCount = (selectedCategory !== "all" ? 1 : 0) + (selectedDifficulty !== "all" ? 1 : 0);

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

  const stats = CATEGORIES.map((cat) => ({
    ...cat,
    count: questions.filter((q) => q.category === cat.value).length,
  }));

  return (
    <>
      <div className="space-y-6 pb-8">
        <SlideIn>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-2xl tracking-tight text-[#F2F4F8] sm:text-[1.75rem]">
                Question Bank
              </h1>
              <p className="mt-1 text-sm text-[#A8B0C2]">
                {questions.length} questions across {CATEGORIES.length} categories
              </p>
            </div>
          </div>
        </SlideIn>

        <FadeIn delay={0.1} direction="up" className="relative z-30">
          <QuestionsFilterBar
            search={search}
            setSearch={setSearch}
            solvedCount={solvedCount}
            totalQuestions={questions.length}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            activeFilterCount={activeFilterCount}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
            stats={stats}
          />
        </FadeIn>

        <FadeIn delay={0.25} direction="up" className="relative z-10">
          <p className="text-xs text-[#A8B0C2]">
            Showing {filtered.length} of {questions.length} question{filtered.length !== 1 ? "s" : ""}
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
          />
        </FadeIn>
      </div>
    </>
  );
}
