import type { PromptInterviewSession, InterviewType } from "@/lib/interview/domain";
import { retrieveQuestionsForSession, type RetrievedQuestion } from "./retrieve";

export interface RagBenchmarkScenario {
  id: string;
  title: string;
  role: string;
  type: InterviewType;
  difficulty: PromptInterviewSession["difficulty"];
  resume: string;
  jobDescription?: string;
  latestAnswer: string;
  expectedKeywords: string[];
  targetCategories: string[];
}

export type ProductionRetrievalRunner = (
  session: PromptInterviewSession,
  limit?: number
) => Promise<RetrievedQuestion[]>;

export function toPromptInterviewSession(
  scenario: RagBenchmarkScenario
): PromptInterviewSession {
  return {
    id: `benchmark-${scenario.id}`,
    role: scenario.role,
    company: null,
    type: scenario.type,
    difficulty: scenario.difficulty,
    persona: null,
    jobDescription: scenario.jobDescription ?? null,
    resumeUrl: null,
    resumeText: scenario.resume,
    questionCount: 10,
    currentQuestion: 3,
    focusAreas: null,
    sessionPlan: null,
    transcript: [
      {
        question: "(previous question)",
        answer: scenario.latestAnswer,
        order: 0,
      },
    ],
  };
}

export async function runProductionRetrieval(
  scenario: RagBenchmarkScenario,
  runner: ProductionRetrievalRunner = retrieveQuestionsForSession
): Promise<RetrievedQuestion[]> {
  const session = toPromptInterviewSession(scenario);
  return runner(session, 6);
}
