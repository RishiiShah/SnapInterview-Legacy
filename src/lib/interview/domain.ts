import { z } from "zod/v4";

export const INTERVIEW_TYPE_VALUES = ["behavioral", "technical", "system-design", "leadership"] as const;
export const INTERVIEW_DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;
export const INTERVIEW_PERSONA_VALUES = ["friendly", "balanced", "strict"] as const;
export const INTERVIEW_QUESTION_COUNT_VALUES = [5, 10, 15] as const;

// Interview session IDs are UUIDs (client-generated and DB default). Shared by every
// route that accepts an interviewId so validation stays consistent in one place.
export const interviewIdSchema = z.string().uuid("interviewId must be a valid UUID");

export const interviewTypeSchema = z.enum(INTERVIEW_TYPE_VALUES);
export const interviewDifficultySchema = z.enum(INTERVIEW_DIFFICULTY_VALUES);
export const interviewPersonaSchema = z.enum(INTERVIEW_PERSONA_VALUES);
export const interviewQuestionCountSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
]);

export type InterviewType = z.infer<typeof interviewTypeSchema>;
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
  const personaResult = session.persona == null ? { success: true as const, data: null } : interviewPersonaSchema.safeParse(session.persona);

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
