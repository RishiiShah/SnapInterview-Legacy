import type { Difficulty, InterviewType } from "@/lib/interview/domain";
import { coerceInterviewType, INTERVIEW_TYPE_VALUES } from "@/lib/interview/domain";

export type PracticeRetakeDefaults = {
  role?: string;
  type?: InterviewType;
  difficulty?: Difficulty;
};

export type PracticeRetakeSearchParams = {
  role?: string | string[];
  type?: string | string[];
  difficulty?: string | string[];
};

const RETAKE_DIFFICULTIES = ["easy", "medium", "hard"] as const satisfies readonly Difficulty[];

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePracticeRetakeDefaults(
  searchParams: PracticeRetakeSearchParams | undefined,
): PracticeRetakeDefaults {
  const role = firstSearchParam(searchParams?.role);
  const type = firstSearchParam(searchParams?.type);
  const difficulty = firstSearchParam(searchParams?.difficulty);
  const coercedType = type ? coerceInterviewType(type) : null;

  return {
    ...(role ? { role } : {}),
    ...(coercedType && (INTERVIEW_TYPE_VALUES as readonly string[]).includes(coercedType)
      ? { type: coercedType }
      : {}),
    ...(difficulty && (RETAKE_DIFFICULTIES as readonly string[]).includes(difficulty)
      ? { difficulty: difficulty as Difficulty }
      : {}),
  };
}
