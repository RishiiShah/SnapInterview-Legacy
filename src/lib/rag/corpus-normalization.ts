/**
 * Normalizes a question string for deduplication comparison.
 */
export function normalizeCorpusQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deduplicates records by normalized question text, preferring entries with non-null answers.
 */
export function dedupeByNormalizedQuestion<
  T extends { question: string; answer: string | null },
>(records: readonly T[]): { unique: T[]; dropped: number } {
  const byNormalized = new Map<string, T>();
  let dropped = 0;

  for (const record of records) {
    const key = normalizeCorpusQuestion(record.question);
    const existing = byNormalized.get(key);
    if (existing) {
      dropped++;
      // Keep whichever copy carries a reference answer.
      if (!existing.answer && record.answer) {
        byNormalized.set(key, record);
      }
      continue
    }
    byNormalized.set(key, record);
  }

  return { unique: [...byNormalized.values()], dropped };
}
