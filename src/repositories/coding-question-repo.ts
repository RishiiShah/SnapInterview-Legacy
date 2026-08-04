import { CodingQuestionSchema, type CodingWorkspaceQuestion } from "@/lib/coding/contracts";
import { prisma } from "@/lib/prisma";

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
  solvedBy: Array<{ userId: string }>;
};

export type CodingCatalogQuestion = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topics: string[];
  estimatedTime: string | null;
  solved: boolean;
};

export function toCodingWorkspaceQuestion(question: WorkspaceQuestionRecord): CodingWorkspaceQuestion {
  return CodingQuestionSchema.parse({
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
      .map(({ ordinal, input, expectedOutput }) => ({ ordinal, input, expectedOutput })),
    solved: question.solvedBy.length > 0,
  });
}

export async function getPublishedCodingQuestions(userId: string): Promise<CodingCatalogQuestion[]> {
  const questions = await prisma.codingQuestion.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      topics: true,
      estimatedTime: true,
      solvedBy: { where: { userId }, select: { userId: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return questions.map((question) => ({
    ...question,
    solved: question.solvedBy.length > 0,
  }));
}

export async function getPublishedCodingWorkspace(
  slug: string,
  userId: string,
): Promise<CodingWorkspaceQuestion | null> {
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
      solvedBy: { where: { userId }, select: { userId: true } },
    },
  });

  return question ? toCodingWorkspaceQuestion(question) : null;
}

export async function getCodingSubmissionHistory(userId: string, codingQuestionId: string) {
  return prisma.codingSubmission.findMany({
    where: { userId, codingQuestionId },
    select: {
      id: true,
      language: true,
      verdict: true,
      passedCount: true,
      totalCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
