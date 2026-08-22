/**
 * Parses a CSV Tags cell into normalized keyword tokens for FTS / sparse retrieval.
 */
export function parseCorpusTags(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,;|]/)) {
    const tag = part.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag.length < 2 || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 24) break;
  }
  return tags;
}

/** Significant tokens for near-duplicate question detection at ingest. */
export function significantQuestionTokens(question: string): Set<string> {
  return new Set(
    normalizeCorpusQuestion(question)
      .split(" ")
      .filter((token) => token.length > 3)
  );
}

export function questionTokenJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Drops near-duplicate questions (high token overlap) after exact-normalized dedupe.
 * Prefers rows that carry a reference answer.
 */
export function dropNearDuplicateQuestions<
  T extends { question: string; answer: string | null },
>(records: readonly T[], jaccardThreshold = 0.72): { unique: T[]; dropped: number } {
  const kept: T[] = [];
  const keptTokens: Set<string>[] = [];
  let dropped = 0;

  for (const record of records) {
    const tokens = significantQuestionTokens(record.question);
    let nearIndex = -1;
    for (let i = 0; i < keptTokens.length; i++) {
      if (questionTokenJaccard(tokens, keptTokens[i]) >= jaccardThreshold) {
        nearIndex = i;
        break;
      }
    }

    if (nearIndex === -1) {
      kept.push(record);
      keptTokens.push(tokens);
      continue;
    }

    dropped++;
    const existing = kept[nearIndex];
    if (!existing.answer && record.answer) {
      kept[nearIndex] = record;
      keptTokens[nearIndex] = tokens;
    }
  }

  return { unique: kept, dropped };
}

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
