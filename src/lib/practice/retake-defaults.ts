import type { Difficulty, InterviewType } from "@/lib/interview/domain";

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

const RETAKE_INTERVIEW_TYPES = ["behavioral", "technical", "system-design", "leadership"] as const satisfies readonly InterviewType[];
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

  return {
    ...(role ? { role } : {}),
    ...(type && (RETAKE_INTERVIEW_TYPES as readonly string[]).includes(type) ? { type: type as InterviewType } : {}),
    ...(difficulty && (RETAKE_DIFFICULTIES as readonly string[]).includes(difficulty) ? { difficulty: difficulty as Difficulty } : {}),
  };
}
