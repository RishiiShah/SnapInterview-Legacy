import { createHash } from "node:crypto";

import { parseCsvRecords } from "@/lib/csv";
import {
  normalizeCorpusQuestion,
  parseCorpusTags,
} from "@/lib/rag/corpus-normalization";

export type CorpusSourceKind = "technical" | "hr";

export type CorpusSourceRecord = {
  sourceKind: CorpusSourceKind;
  sourceId: string;
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  level: string;
  tags: string[];
  type: string;
  roleOverride: string;
  context: string;
  followUpOf: string;
  commonMistakes: string;
  normalizedQuestion: string;
  contentHash: string;
};

export type CorpusValidationIssue = {
  sourceKey: string;
  field: keyof CorpusSourceRecord | "row";
  message: string;
};

export type StagedCorpusRecord = {
  sourceKind: CorpusSourceKind;
  sourceId: string;
  contentHash: string;
  embedding: readonly number[] | null;
};

export type CorpusSyncPreflight = {
  sourceRecords: readonly CorpusSourceRecord[];
  stagedRecords: readonly StagedCorpusRecord[];
};

const REQUIRED_COLUMNS = [
  "question number",
  "question",
  "answer",
  "category",
  "difficulty",
  "level",
  "tags",
  "type",
  "roleoverride",
  "context",
  "followupof",
  "commonmistakes",
] as const;

const ALLOWED_DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);
const ALLOWED_LEVELS = new Set([
  "Intern",
  "Early",
  "Junior",
  "Mid",
  "Senior",
  "Staff",
  "Principal",
  "Engineering Manager",
]);
const ALLOWED_TYPES: Record<CorpusSourceKind, Set<string>> = {
  technical: new Set(["technical", "behavioral-technical"]),
  hr: new Set(["behavioral", "behavioral-technical"]),
};

function corpusSourceKey(record: Pick<CorpusSourceRecord, "sourceKind" | "sourceId">): string {
  return `${record.sourceKind}:${record.sourceId}`;
}

function hashCorpusQuestion(question: string): string {
  return createHash("sha256").update(normalizeCorpusQuestion(question)).digest("hex");
}

export function parseCorpusSource(csvText: string, sourceKind: CorpusSourceKind): CorpusSourceRecord[] {
  const [rawHeader, ...rows] = parseCsvRecords(csvText);
  if (!rawHeader) throw new Error("Corpus CSV is empty");

  const header = rawHeader.map((value) => value.trim().toLowerCase());
  const indexes = new Map(header.map((name, index) => [name, index]));
  const missing = REQUIRED_COLUMNS.filter((name) => !indexes.has(name));
  if (missing.length > 0) {
    throw new Error(`Corpus CSV is missing required columns: ${missing.join(", ")}`);
  }

  const valueAt = (row: string[], name: (typeof REQUIRED_COLUMNS)[number]) =>
    (row[indexes.get(name)!] ?? "").trim();

  return rows.map((row) => {
    const question = valueAt(row, "question");
    return {
      sourceKind,
      sourceId: valueAt(row, "question number"),
      question,
      answer: valueAt(row, "answer"),
      category: valueAt(row, "category"),
      difficulty: valueAt(row, "difficulty"),
      level: valueAt(row, "level"),
      tags: parseCorpusTags(valueAt(row, "tags")),
      type: valueAt(row, "type"),
      roleOverride: valueAt(row, "roleoverride"),
      context: valueAt(row, "context"),
      followUpOf: valueAt(row, "followupof"),
      commonMistakes: valueAt(row, "commonmistakes"),
      normalizedQuestion: normalizeCorpusQuestion(question),
      contentHash: hashCorpusQuestion(question),
    };
  });
}

export function validateCorpusSource(records: readonly CorpusSourceRecord[]): CorpusValidationIssue[] {
  const issues: CorpusValidationIssue[] = [];
  const sourceKeys = new Set<string>();
  const hashes = new Map<string, string>();

  for (const record of records) {
    const sourceKey = corpusSourceKey(record);
    const add = (field: CorpusValidationIssue["field"], message: string) => {
      issues.push({ sourceKey, field, message });
    };

    if (!record.sourceId) add("sourceId", "Question Number is required");
    if (!record.question) add("question", "Question is required");

    if (sourceKeys.has(sourceKey)) {
      add("sourceId", `Duplicate source identity: ${sourceKey}`);
    } else {
      sourceKeys.add(sourceKey);
    }

    if (!record.answer) add("answer", "Answer is required");
    if (!record.category) add("category", "Category is required");
    if (!ALLOWED_DIFFICULTIES.has(record.difficulty)) {
      add("difficulty", `Unsupported difficulty: ${record.difficulty || "(empty)"}`);
    }
    if (!ALLOWED_LEVELS.has(record.level)) {
      add("level", `Unsupported level: ${record.level || "(empty)"}`);
    }
    if (!ALLOWED_TYPES[record.sourceKind].has(record.type)) {
      add("type", `Unsupported ${record.sourceKind} type: ${record.type || "(empty)"}`);
    }

    const priorKey = hashes.get(record.contentHash);
    if (record.normalizedQuestion && priorKey) {
      add("contentHash", `Normalized question duplicates ${priorKey}`);
    } else if (record.normalizedQuestion) {
      hashes.set(record.contentHash, sourceKey);
    }
  }

  return issues;
}

export function assertValidCorpusSource(records: readonly CorpusSourceRecord[]): void {
  const issues = validateCorpusSource(records);
  if (issues.length === 0) return;
  throw new Error(
    `Corpus source validation failed:\n${issues
      .map((issue) => `- ${issue.sourceKey} ${issue.field}: ${issue.message}`)
      .join("\n")}`
  );
}

export function assertCorpusSourceCounts(
  records: readonly Pick<CorpusSourceRecord, "sourceKind" | "sourceId">[]
): void {
  const technical = records.filter((record) => record.sourceKind === "technical").length;
  const hr = records.filter((record) => record.sourceKind === "hr").length;
  if (technical !== 3000 || hr !== 1440) {
    throw new Error(
      `Expected 3000 technical and 1440 HR questions; received ${technical} technical and ${hr} HR`
    );
  }
}

export function assertSafeCorpusSync({
  sourceRecords,
  stagedRecords,
}: CorpusSyncPreflight): void {
  if (sourceRecords.length !== stagedRecords.length) {
    throw new Error(
      `Staged corpus count ${stagedRecords.length} does not match source count ${sourceRecords.length}`
    );
  }
  for (const kind of ["technical", "hr"] as const) {
    const expected = sourceRecords.filter(({ sourceKind }) => sourceKind === kind).length;
    const actual = stagedRecords.filter(({ sourceKind }) => sourceKind === kind).length;
    if (actual !== expected) {
      throw new Error(`Staged ${kind} count ${actual} does not match source count ${expected}`);
    }
  }
  const missingEmbedding = stagedRecords.find(({ embedding }) => !embedding || embedding.length === 0);
  if (missingEmbedding) {
    throw new Error(`Staged record ${corpusSourceKey(missingEmbedding)} is missing an embedding`);
  }

  const expectedHashes = [...sourceRecords.map(({ contentHash }) => contentHash)].sort();
  const stagedHashes = [...stagedRecords.map(({ contentHash }) => contentHash)].sort();
  if (
    expectedHashes.length !== new Set(expectedHashes).size ||
    stagedHashes.length !== new Set(stagedHashes).size ||
    expectedHashes.some((hash, index) => hash !== stagedHashes[index])
  ) {
    throw new Error("Staged corpus hashes do not exactly match the validated source hashes");
  }
}
