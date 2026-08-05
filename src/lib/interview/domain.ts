import { z } from "zod/v4";

/**
 * Hiring-loop interview kinds (what companies actually run).
 * Labels vary by company; these are the common shapes of a loop.
 */
export const INTERVIEW_TYPE_VALUES = [
  "recruiter-screen",
  "behavioral-leadership",
  "coding-algorithms",
  "system-design",
  "domain-role",
  "take-home",
  "hiring-manager",
  "bar-raiser",
] as const;

/** Legacy session / preference values still present in DB. */
const LEGACY_INTERVIEW_TYPE_MAP: Record<string, (typeof INTERVIEW_TYPE_VALUES)[number]> = {
  behavioral: "behavioral-leadership",
  leadership: "behavioral-leadership",
  technical: "coding-algorithms",
  coding: "coding-algorithms",
  "system-design": "system-design",
};

export const INTERVIEW_TYPE_META: Record<
  (typeof INTERVIEW_TYPE_VALUES)[number],
  { label: string; shortLabel: string; description: string }
> = {
  "recruiter-screen": {
    label: "Recruiter / screen",
    shortLabel: "Screen",
    description: "Fit, logistics, and basics",
  },
  "behavioral-leadership": {
    label: "Behavioral / leadership",
    shortLabel: "Behavioral",
    description: "Past stories, collaboration, ownership",
  },
  "coding-algorithms": {
    label: "Coding / algorithms",
    shortLabel: "Coding",
    description: "Live problem-solving and data structures",
  },
  "system-design": {
    label: "System design",
    shortLabel: "Sys design",
    description: "Architecture for mid/senior+ roles",
  },
  "domain-role": {
    label: "Domain / role-specific",
    shortLabel: "Domain",
    description: "Frontend, ML, SQL, product sense, etc.",
  },
  "take-home": {
    label: "Take-home / project",
    shortLabel: "Take-home",
    description: "Async assignment, sometimes with a review",
  },
  "hiring-manager": {
    label: "Hiring manager",
    shortLabel: "HM",
    description: "Team fit, expectations, leveling",
  },
  "bar-raiser": {
    label: "Bar raiser / panel",
    shortLabel: "Bar raiser",
    description: "Cross-team calibration or additional panelists, not necessarily last",
  },
};

/**
 * Question-bank categories (practice prompts) — separate from live interview kinds.
 */
export const QUESTION_CATEGORY_VALUES = [
  "behavioral",
  "technical",
  "system-design",
  "leadership",
] as const;

export const INTERVIEW_DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;
export const INTERVIEW_PERSONA_VALUES = ["friendly", "balanced", "strict"] as const;
export const INTERVIEW_QUESTION_COUNT_VALUES = [5, 10, 15] as const;

export const interviewIdSchema = z.string().uuid("interviewId must be a valid UUID");

export function coerceInterviewType(value: unknown): (typeof INTERVIEW_TYPE_VALUES)[number] | null {
  if (typeof value !== "string") return null;
  if ((INTERVIEW_TYPE_VALUES as readonly string[]).includes(value)) {
    return value as (typeof INTERVIEW_TYPE_VALUES)[number];
  }
  return LEGACY_INTERVIEW_TYPE_MAP[value] ?? null;
}

export const interviewTypeSchema = z.preprocess(
  (value) => coerceInterviewType(value) ?? value,
  z.enum(INTERVIEW_TYPE_VALUES),
);

export const questionCategorySchema = z.enum(QUESTION_CATEGORY_VALUES);
export const interviewDifficultySchema = z.enum(INTERVIEW_DIFFICULTY_VALUES);
export const interviewPersonaSchema = z.enum(INTERVIEW_PERSONA_VALUES);
export const interviewQuestionCountSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
]);

export type InterviewType = (typeof INTERVIEW_TYPE_VALUES)[number];
export type QuestionCategory = (typeof QUESTION_CATEGORY_VALUES)[number];
export type Difficulty = z.infer<typeof interviewDifficultySchema>;
export type InterviewPersona = z.infer<typeof interviewPersonaSchema>;
export type InterviewQuestionCount = z.infer<typeof interviewQuestionCountSchema>;

export type PromptInterviewSession = {
  role: string;
  company: string | null;
  type: InterviewType;
  difficulty: Difficulty;
  persona?: InterviewPersona | null;
  jobDescription: string | null;
  resumeUrl: string | null;
  resumeText?: string | null;
  questionCount: number;
  currentQuestion: number;
  focusAreas?: unknown;
  sessionPlan?: unknown;
  transcript?: Array<{
    question: string;
    answer: string;
    order: number;
  }>;
};

export function normalizePromptInterviewSession(session: {
  role: string;
  company: string | null;
  type: string;
  difficulty: string;
  persona?: string | null;
  jobDescription: string | null;
  resumeUrl: string | null;
  resumeText?: string | null;
  questionCount: number;
  currentQuestion: number;
  focusAreas?: unknown;
  sessionPlan?: unknown;
  transcript?: Array<{
    question: string;
    answer: string;
    order: number;
  }>;
}): PromptInterviewSession | null {
  const typeResult = interviewTypeSchema.safeParse(session.type);
  const difficultyResult = interviewDifficultySchema.safeParse(session.difficulty);
  const personaResult =
    session.persona == null
      ? { success: true as const, data: null }
      : interviewPersonaSchema.safeParse(session.persona);

  if (!typeResult.success || !difficultyResult.success || !personaResult.success) {
    return null;
  }

  return {
    ...session,
    type: typeResult.data,
    difficulty: difficultyResult.data,
    persona: personaResult.data,
  };
}

export type StartInterviewSessionInput = {
  id?: string;
  userId: string;
  role: string;
  company?: string | null;
  type: InterviewType;
  difficulty: Difficulty;
  persona?: InterviewPersona;
  jobDescription?: string | null;
  resumeUrl?: string | null;
  resumeText?: string | null;
  questionCount?: InterviewQuestionCount;
};
