import { prisma } from "@/lib/prisma";
import { QUESTIONS } from "@/data/questions";
import type { Question } from "@/data/types";
import { logger } from "@/utils/logger";

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
      return dbQuestions.map((q) => ({
        id: q.id,
        slug: q.slug,
        text: q.text,
        category: q.category as Question["category"],
        difficulty: q.difficulty as Question["difficulty"],
        estimatedTime: q.estimatedTime || "5 min",
        tags: q.tags,
        hint: q.hint || undefined,
        sampleAnswer: q.sampleAnswer || undefined,
      }));
    }
  } catch (error) {
    logger.error("Failed to fetch questions from database, falling back to static", {
      error: error instanceof Error ? error.message : String(error),
    });
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
      return {
        id: q.id,
        slug: q.slug,
        text: q.text,
        category: q.category as Question["category"],
        difficulty: q.difficulty as Question["difficulty"],
        estimatedTime: q.estimatedTime || "5 min",
        tags: q.tags,
        hint: q.hint || undefined,
        sampleAnswer: q.sampleAnswer || undefined,
      };
    }
  } catch (error) {
    logger.error(`Failed to fetch question ${slug} from database`, {
      error: error instanceof Error ? error.message : String(error),
    });
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
      return {
        id: q.id,
        slug: q.slug,
        text: q.text,
        category: q.category as Question["category"],
        difficulty: q.difficulty as Question["difficulty"],
        estimatedTime: q.estimatedTime || "5 min",
        tags: q.tags,
        hint: q.hint || undefined,
        sampleAnswer: q.sampleAnswer || undefined,
      };
    }
  } catch (error) {
    logger.error(`Failed to fetch question ID ${id} from database`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return QUESTIONS.find((q) => q.id === id);
}
