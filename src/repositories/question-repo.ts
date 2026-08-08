import { prisma } from "@/lib/prisma";
import { QUESTIONS } from "@/data/questions";
import type { Question } from "@/data/types";
import { QUESTION_CATEGORY_VALUES } from "@/lib/interview/domain";
import { logger } from "@/utils/logger";

function isQuestionCategory(category: string): category is Question["category"] {
  return (QUESTION_CATEGORY_VALUES as readonly string[]).includes(category);
}

function mapPracticeQuestion(question: {
  id: number;
  slug: string;
  text: string;
  category: string;
  difficulty: string;
  estimatedTime: string | null;
  tags: string[];
  hint: string | null;
  sampleAnswer: string | null;
}): Question | null {
  if (!isQuestionCategory(question.category)) {
    return null;
  }

  return {
    id: question.id,
    slug: question.slug,
    text: question.text,
    category: question.category,
    difficulty: question.difficulty as Question["difficulty"],
    estimatedTime: question.estimatedTime || "5 min",
    tags: question.tags,
    hint: question.hint || undefined,
    sampleAnswer: question.sampleAnswer || undefined,
  };
}

function logStaticFallback(reason: string, context?: Record<string, unknown>) {
  logger.warn("Using static practice question fallback", {
    reason,
    fallbackSource: "static-questions",
    ...context,
  });
}

/**
 * Fetches all practice questions from the database, 
 * falling back to static questions if the database is empty or unavailable.
 */
export async function getAllPracticeQuestions(): Promise<Question[]> {
  try {
    const dbQuestions = await prisma.practiceQuestion.findMany({
      orderBy: { id: "asc" },
    });

    if (dbQuestions.length > 0) {
      const questions = dbQuestions.flatMap((question) => {
        const mapped = mapPracticeQuestion(question);
        return mapped ? [mapped] : [];
      });

      if (questions.length > 0) {
        return questions;
      }
    }

    logStaticFallback("database-empty");
  } catch (error) {
    logger.error("Failed to fetch questions from database", {
      error: error instanceof Error ? error.message : String(error),
    });
    logStaticFallback("database-error");
  }

  return QUESTIONS;
}

/**
 * Fetches a single question by its slug.
 */
export async function getPracticeQuestionBySlug(slug: string): Promise<Question | undefined> {
  try {
    const q = await prisma.practiceQuestion.findUnique({
      where: { slug },
    });

    if (q) {
      const mapped = mapPracticeQuestion(q);
      if (mapped) {
        return mapped;
      }
    }

    logStaticFallback("database-miss", { slug });
  } catch (error) {
    logger.error(`Failed to fetch question ${slug} from database`, {
      error: error instanceof Error ? error.message : String(error),
    });
    logStaticFallback("database-error", { slug });
  }

  return QUESTIONS.find((q) => q.slug === slug);
}

/**
 * Fetches a single question by its ID.
 */
export async function getPracticeQuestionById(id: number): Promise<Question | undefined> {
  try {
    const q = await prisma.practiceQuestion.findUnique({
      where: { id },
    });

    if (q) {
      const mapped = mapPracticeQuestion(q);
      if (mapped) {
        return mapped;
      }
    }

    logStaticFallback("database-miss", { id });
  } catch (error) {
    logger.error(`Failed to fetch question ID ${id} from database`, {
      error: error instanceof Error ? error.message : String(error),
    });
    logStaticFallback("database-error", { id });
  }

  return QUESTIONS.find((q) => q.id === id);
}

export async function getPracticeQuestionRuntimeDataBySlug(
  slug: string,
): Promise<{
  question: Question;
  allQuestions: Question[];
  currentIndex: number;
} | null> {
  const questions = await getAllPracticeQuestions();
  const currentIndex = questions.findIndex((question) => question.slug === slug);

  if (currentIndex === -1) {
    return null;
  }

  return {
    question: questions[currentIndex],
    allQuestions: questions,
    currentIndex,
  };
}
