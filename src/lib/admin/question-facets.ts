import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export const ADMIN_QUESTION_FACETS_TAG = "admin-question-facets";

export type AdminQuestionFacets = {
  totalQuestions: number;
  categories: Array<{ category: string; _count: { _all: number } }>;
  difficulties: Array<{ difficulty: string; _count: { _all: number } }>;
};

async function loadQuestionFacets(): Promise<AdminQuestionFacets> {
  const [totalQuestions, categories, difficulties] = await Promise.all([
    prisma.practiceQuestion.count(),
    prisma.practiceQuestion.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { category: "asc" },
    }),
    prisma.practiceQuestion.groupBy({
      by: ["difficulty"],
      _count: { _all: true },
      orderBy: { difficulty: "asc" },
    }),
  ]);

  return { totalQuestions, categories, difficulties };
}

export const getAdminQuestionFacets = unstable_cache(
  loadQuestionFacets,
  [ADMIN_QUESTION_FACETS_TAG],
  { revalidate: 120, tags: [ADMIN_QUESTION_FACETS_TAG] },
);
