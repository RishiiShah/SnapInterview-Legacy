import type { PromptInterviewSession, InterviewType } from "@/lib/interview/domain";
import { retrieveQuestionsForSession, type RetrievedQuestion } from "./retrieve";

export type RagBenchmarkTurn = {
  question: string;
  answer: string;
};

export interface RagBenchmarkScenario {
  id: string;
  title: string;
  role: string;
  type: InterviewType;
  difficulty: PromptInterviewSession["difficulty"];
  resume: string;
  jobDescription?: string;
  /** Newest candidate answer (also used by baseline retrieval). */
  latestAnswer: string;
  /**
   * Optional multi-turn history. When present (2+ turns), production retrieval
   * gets a real transcript so coverage tracking + gap-fill can activate.
   * The last turn's answer should match `latestAnswer`.
   */
  transcriptTurns?: RagBenchmarkTurn[];
  focusAreas?: string[];
  expectedKeywords: string[];
  targetCategories: string[];
}

export type ProductionRetrievalRunner = (
  session: PromptInterviewSession,
  limit?: number
) => Promise<RetrievedQuestion[]>;

/**
 * Builds the transcript used by production retrieval.
 * Prefer explicit multi-turn history; otherwise synthesize a single turn from latestAnswer.
 */
export function buildScenarioTranscript(
  scenario: RagBenchmarkScenario
): NonNullable<PromptInterviewSession["transcript"]> {
  if (scenario.transcriptTurns && scenario.transcriptTurns.length > 0) {
    return scenario.transcriptTurns.map((turn, index) => ({
      question: turn.question,
      answer: turn.answer,
      order: index,
    }));
  }

  return [
    {
      question: "(previous question)",
      answer: scenario.latestAnswer,
      order: 0,
    },
  ];
}

export function toPromptInterviewSession(
  scenario: RagBenchmarkScenario
): PromptInterviewSession {
  const transcript = buildScenarioTranscript(scenario);
  const turnCount = transcript.length;

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
    questionCount: Math.max(10, turnCount + 4),
    // Multi-turn scenarios advance with real history; single-turn keeps a mid-session
    // currentQuestion so stage-aware weights match the historical benchmark shape.
    currentQuestion: scenario.transcriptTurns && scenario.transcriptTurns.length > 1
      ? turnCount
      : 3,
    focusAreas: scenario.focusAreas ?? null,
    sessionPlan: scenario.focusAreas
      ? {
          brief: {
            agenda: {
              pillars: scenario.focusAreas.map((title, index) => ({
                id: `pillar-${index}`,
                title,
                targetMinutes: 8,
              })),
            },
            profile: {
              level:
                scenario.difficulty === "easy"
                  ? "entry-level"
                  : scenario.difficulty === "hard"
                    ? "senior"
                    : "mid-level",
            },
          },
        }
      : null,
    transcript,
  };
}

export async function runProductionRetrieval(
  scenario: RagBenchmarkScenario,
  runner: ProductionRetrievalRunner = retrieveQuestionsForSession
): Promise<RetrievedQuestion[]> {
  const session = toPromptInterviewSession(scenario);
  return runner(session, 6);
}
