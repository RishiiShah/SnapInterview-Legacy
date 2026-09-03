import {
  mapHrCategory,
  mapSoftwareCategory,
  normalizeCategory,
} from "./taxonomy";
import type { CorpusSourceRecord } from "./corpus-quality";

export interface CorpusRecord {
  sourceId: string;
  question: string;
  answer: string | null;
  commonMistakes: string | null;
  category: string;
  difficulty: string | null;
  level: string | null;
  types: string[];
  roleTags: string[];
  keywords: string[];
  source: string;
  contentHash: string;
}

/** Maps a validated CSV row without changing text used for embeddings. */
export function toCorpusRecord(
  record: CorpusSourceRecord,
  source: string
): CorpusRecord {
  const category =
    record.sourceKind === "technical"
      ? normalizeCategory(record.category)
      : record.category;
  const { types, roleTags } =
    record.sourceKind === "technical"
      ? mapSoftwareCategory(category)
      : mapHrCategory(category);

  return {
    sourceId: record.sourceId,
    question: record.question,
    answer: record.answer,
    commonMistakes: record.commonMistakes || null,
    category,
    difficulty: record.difficulty,
    level: record.level,
    types,
    roleTags,
    keywords: record.tags,
    source,
    contentHash: record.contentHash,
  };
}
