const GENERIC_QUESTION_WORDS = new Set([
  "about",
  "could",
  "describe",
  "example",
  "explain",
  "would",
  "should",
  "question",
  "through",
  "tell",
  "time",
  "when",
  "what",
  "which",
  "with",
  "your",
]);

export type EvaluationTranscriptTurn = {
  order: number;
  question: string;
  answer: string;
};

export type RetrievedEvaluationRubric = {
  questionOrder: number;
  question: {
    sourceId: string | null;
    question: string;
    answer: string | null;
    commonMistakes: string | null;
  };
};

function matchTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#.-]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3 && !GENERIC_QUESTION_WORDS.has(token))
      .map((token) => {
        if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3);
        if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2);
        if (token.endsWith("es") && token.length > 5) return token.slice(0, -2);
        if (token.endsWith("s") && token.length > 4) return token.slice(0, -1);
        return token;
      })
  );
}

function questionMatchScore(asked: string, reference: string): {
  intersection: number;
  jaccard: number;
} {
  const askedTokens = matchTokens(asked);
  const referenceTokens = matchTokens(reference);
  let intersection = 0;
  for (const token of askedTokens) {
    if (referenceTokens.has(token)) intersection += 1;
  }
  const union = askedTokens.size + referenceTokens.size - intersection;
  return { intersection, jaccard: union > 0 ? intersection / union : 0 };
}

/**
 * Matches each asked question to at most one rubric retrieved for that turn.
 * Weak lexical matches are omitted rather than risking an unrelated penalty.
 */
export function formatMatchedEvaluationRubrics(
  transcript: EvaluationTranscriptTurn[],
  retrievals: RetrievedEvaluationRubric[]
): string {
  const matched: string[] = [];

  for (const turn of transcript) {
    const candidates = retrievals.filter(
      (entry) => entry.questionOrder === turn.order
    );
    const ranked = candidates
      .map((entry) => ({
        entry,
        ...questionMatchScore(turn.question, entry.question.question),
      }))
      .sort(
        (a, b) =>
          b.jaccard - a.jaccard || b.intersection - a.intersection
      );
    const best = ranked[0];
    if (!best || best.intersection < 2 || best.jaccard < 0.12) continue;

    const lines = [
      `[Q${turn.order + 1} rubric | Source question ${best.entry.question.sourceId ?? "unknown"}]`,
      `Expected answer: ${best.entry.question.answer ?? "No reference answer supplied."}`,
    ];
    if (best.entry.question.commonMistakes) {
      lines.push(`Common mistakes: ${best.entry.question.commonMistakes}`);
    }
    matched.push(lines.join("\n"));
  }

  if (matched.length === 0) return "";
  return [
    "REFERENCE RUBRICS MATCHED TO ASKED QUESTIONS:",
    "Only count a common mistake when the candidate's answer demonstrates it. Never infer a mistake from silence, wording, or an unrelated answer.",
    ...matched,
  ].join("\n\n");
}
