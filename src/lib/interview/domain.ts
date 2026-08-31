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
export const INTERVIEW_LEVEL_VALUES = ["entry-level", "mid-level", "senior", "staff-plus"] as const;
export const INTERVIEW_PERSONA_VALUES = ["friendly", "balanced", "strict"] as const;
export const INTERVIEW_QUESTION_COUNT_VALUES = [5, 10, 15] as const;
export const INTERVIEW_DURATION_VALUES = [15, 30, 45] as const;

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
const LEGACY_INTERVIEW_LEVEL_MAP: Record<string, (typeof INTERVIEW_LEVEL_VALUES)[number]> = {
  intern: "entry-level",
  junior: "entry-level",
  early: "entry-level",
  entry: "entry-level",
  mid: "mid-level",
  intermediate: "mid-level",
  staff: "staff-plus",
  principal: "staff-plus",
};

export function coerceInterviewLevel(value: unknown): (typeof INTERVIEW_LEVEL_VALUES)[number] | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if ((INTERVIEW_LEVEL_VALUES as readonly string[]).includes(normalized)) {
    return normalized as (typeof INTERVIEW_LEVEL_VALUES)[number];
  }
  return LEGACY_INTERVIEW_LEVEL_MAP[normalized] ?? null;
}

export const interviewLevelSchema = z.preprocess(
  (value) => coerceInterviewLevel(value) ?? value,
  z.enum(INTERVIEW_LEVEL_VALUES),
);

export function getDefaultInterviewLevelForDifficulty(difficulty: Difficulty): InterviewLevel {
  if (difficulty === "easy") return "entry-level";
  if (difficulty === "hard") return "senior";
  return "mid-level";
}

export function getDefaultInterviewDifficultyForLevel(level: InterviewLevel): Difficulty {
  if (level === "entry-level") return "easy";
  if (level === "senior" || level === "staff-plus") return "hard";
  return "medium";
}
export const interviewPersonaSchema = z.enum(INTERVIEW_PERSONA_VALUES);
export const interviewQuestionCountSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
]);

export const interviewDurationSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(45),
]);

export type InterviewType = (typeof INTERVIEW_TYPE_VALUES)[number];
export type QuestionCategory = (typeof QUESTION_CATEGORY_VALUES)[number];
export type Difficulty = z.infer<typeof interviewDifficultySchema>;
export type InterviewLevel = z.infer<typeof interviewLevelSchema>;
export type InterviewPersona = z.infer<typeof interviewPersonaSchema>;
export type InterviewQuestionCount = z.infer<typeof interviewQuestionCountSchema>;
export type InterviewDuration = z.infer<typeof interviewDurationSchema>;

export type PromptInterviewSession = {
  role: string;
  company: string | null;
  // Optional. Used to skip questions this user saw in earlier interviews.
  userId?: string | null;
  // Optional. Used to record which questions were used, so later turns skip
  // them. Without it the search still works, but may repeat questions.
  id?: string | null;
  type: InterviewType;
  difficulty: Difficulty;
  level?: InterviewLevel | null;
  persona?: InterviewPersona | null;
  jobDescription: string | null;
  resumeUrl: string | null;
  resumeText?: string | null;
  questionCount: number;
  currentQuestion: number;
  durationMinutes?: number;
  startedAt?: string;
  focusAreas?: unknown;
  sessionPlan?: unknown;
  transcript?: Array<{
    question: string;
    answer: string;
    order: number;
  }>;
};

/**
 * The most recent answered question, found by its `order` value.
 *
 * Do not use `transcript[0]` for this. The repository sorts newest-first when
 * running an interview but oldest-first when grading one, so the first item
 * means opposite things depending on where it came from. Prompts are built in
 * both cases, and reading the first item once anchored the grading prompt on
 * the candidate's opening answer.
 */
export function latestTranscriptEntry(
  transcript: PromptInterviewSession["transcript"]
): { question: string; answer: string; order: number } | null {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return null;
  }

  return transcript.reduce((latest, entry) => (entry.order > latest.order ? entry : latest));
}

/**
 * Most recent N transcript turns by `order` (oldest → newest within the window).
 * Used for short-term interview memory without embedding the full session.
 */
export function recentTranscriptEntries(
  transcript: PromptInterviewSession["transcript"],
  limit = 2
): Array<{ question: string; answer: string; order: number }> {
  if (!Array.isArray(transcript) || transcript.length === 0 || limit <= 0) {
    return [];
  }

  return [...transcript]
    .sort((a, b) => a.order - b.order)
    .slice(-limit);
}

export function normalizePromptInterviewSession(session: {
  role: string;
  company: string | null;
  userId?: string | null;
  id?: string | null;
  type: string;
  difficulty: string;
  level?: string | null;
  persona?: string | null;
  jobDescription: string | null;
  resumeUrl: string | null;
  resumeText?: string | null;
  questionCount: number;
  currentQuestion: number;
  durationMinutes?: number;
  startedAt?: string | Date;
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
  const levelResult = session.level == null
    ? { success: true as const, data: null }
    : interviewLevelSchema.safeParse(session.level);
  const personaResult =
    session.persona == null
      ? { success: true as const, data: null }
      : interviewPersonaSchema.safeParse(session.persona);

  if (!typeResult.success || !difficultyResult.success || !levelResult.success || !personaResult.success) {
    return null;
  }

  return {
    ...session,
    type: typeResult.data,
    difficulty: difficultyResult.data,
    level: levelResult.data,
    persona: personaResult.data,
    durationMinutes: session.durationMinutes,
    startedAt: session.startedAt instanceof Date ? session.startedAt.toISOString() : session.startedAt,
  };
}

export type StartInterviewSessionInput = {
  id?: string;
  userId: string;
  role: string;
  company?: string | null;
  type: InterviewType;
  difficulty: Difficulty;
  level?: InterviewLevel;
  persona?: InterviewPersona;
  jobDescription?: string | null;
  resumeUrl?: string | null;
  resumeText?: string | null;
  questionCount?: InterviewQuestionCount;
  durationMinutes?: InterviewDuration;
};
