import type { PromptInterviewSession } from "@/lib/interview/domain";

export interface RetrievedQuestion {
  /** Corpus row id, recorded so the question is not injected again. */
  id: string;
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
  similarity: number;
}

/**
 * Explains why a specific reference question matches the candidate context.
 */
export function explainRetrievedMatch(
  q: RetrievedQuestion,
  session?: PromptInterviewSession
): string {
  if (!session) return `Calibrated for ${q.category}`;

  const qLower = q.question.toLowerCase();
  const matchedFocus: string[] = [];

  if (Array.isArray(session.focusAreas)) {
    for (const fa of session.focusAreas) {
      if (typeof fa === "string" && qLower.includes(fa.toLowerCase())) {
        matchedFocus.push(fa);
      }
    }
  }

  if (matchedFocus.length > 0) {
    return `Matches focus on ${matchedFocus.slice(0, 2).join(", ")}`;
  }

  return `Calibrated for ${session.role} · ${q.category}`;
}

/**
 * Formats retrieved reference questions into the system instruction.
 */
export function formatRetrievedQuestions(
  questions: RetrievedQuestion[],
  session?: PromptInterviewSession
): string {
  if (questions.length === 0) {
    return "";
  }

  const lines = questions.map((entry, index) => {
    const why = explainRetrievedMatch(entry, session);
    const parts = [
      `[Reference Question ${index + 1} | ${entry.category}] "${entry.question}"`,
      `  - Why selected: ${why}`,
    ];
    if (entry.answer) {
      parts.push(`  - Evaluation key points: ${entry.answer}`);
    }
    return parts.join("\n");
  });

  return [
    "## INTERNAL REFERENCE QUESTION BANK (For topic & depth calibration only)",
    "These are calibrated reference points to guide what depth to expect.",
    "- Do NOT read these questions verbatim or follow them like a checklist.",
    "- Adapt the core concepts into natural scenario-based questions connected to what the candidate just said.",
    "- Use the evaluation key points to assess technical accuracy and formulate probing follow-ups.",
    "",
    ...lines,
  ].join("\n");
}
