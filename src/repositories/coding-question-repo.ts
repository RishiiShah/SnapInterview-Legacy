import { CodingQuestionSchema, type CodingWorkspaceQuestion } from "@/lib/coding/contracts";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

type WorkspaceQuestionRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  constraints: string | null;
  difficulty: string;
  topics: string[];
  estimatedTime: string | null;
  hint: string | null;
  starterCode: unknown;
  solutionCode?: unknown;
  testCases: Array<{
    ordinal: number;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>;
};

export type CodingCatalogQuestion = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topics: string[];
  estimatedTime: string | null;
};

export const CODING_CATALOG_CACHE_TAG = "coding-catalog-v1";

export function toCodingWorkspaceQuestion(question: WorkspaceQuestionRecord): CodingWorkspaceQuestion | null {
  const parsed = CodingQuestionSchema.safeParse({
    id: question.id,
    slug: question.slug,
    title: question.title,
    description: question.description,
    constraints: question.constraints,
    difficulty: question.difficulty,
    topics: question.topics,
    estimatedTime: question.estimatedTime,
    hint: question.hint,
    starterCode: question.starterCode,
    sampleTestCases: question.testCases
      .filter((testCase) => !testCase.isHidden)
      .map(({ input, expectedOutput }, index) => ({ ordinal: index + 1, input, expectedOutput })),
  });

  return parsed.success ? parsed.data : null;
}

async function getPublishedCodingQuestionsUncached(): Promise<CodingCatalogQuestion[]> {
  const questions = await prisma.codingQuestion.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      constraints: true,
      difficulty: true,
      topics: true,
      estimatedTime: true,
      hint: true,
      starterCode: true,
      testCases: {
        where: { isHidden: false },
        select: { ordinal: true, input: true, expectedOutput: true },
        orderBy: { ordinal: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return questions.flatMap((question) => {
    const workspace = toCodingWorkspaceQuestion({
      ...question,
      testCases: question.testCases.map((testCase) => ({ ...testCase, isHidden: false })),
    });

    return workspace
      ? [{
          id: workspace.id,
          slug: workspace.slug,
          title: workspace.title,
          difficulty: workspace.difficulty,
          topics: workspace.topics,
          estimatedTime: workspace.estimatedTime,
        }]
      : [];
  });
}

export async function getPublishedCodingQuestions(): Promise<CodingCatalogQuestion[]> {
  return unstable_cache(
    getPublishedCodingQuestionsUncached,
    [CODING_CATALOG_CACHE_TAG],
    {
      revalidate: 300,
      tags: [CODING_CATALOG_CACHE_TAG],
    },
  )();
}

export async function getPublishedCodingWorkspace(slug: string): Promise<CodingWorkspaceQuestion | null> {
  const question = await prisma.codingQuestion.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      constraints: true,
      difficulty: true,
      topics: true,
      estimatedTime: true,
      hint: true,
      starterCode: true,
      testCases: {
        where: { isHidden: false },
        select: { ordinal: true, input: true, expectedOutput: true, isHidden: true },
        orderBy: { ordinal: "asc" },
      },
    },
  });

  return question ? toCodingWorkspaceQuestion(question) : null;
}
