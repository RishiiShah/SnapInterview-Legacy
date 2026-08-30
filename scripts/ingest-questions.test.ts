import { describe, expect, it } from "vitest";

import {
  assertSafeCorpusSync,
  type CorpusSourceRecord,
  type StagedCorpusRecord,
} from "../src/lib/rag/corpus-quality";

function source(sourceKind: "technical" | "hr", sourceId: string): CorpusSourceRecord {
  const question = `Unique ${sourceKind} question ${sourceId}?`;
  return {
    sourceKind,
    sourceId,
    question,
    answer: "A complete reference answer for this question.",
    category: sourceKind === "technical" ? "Security" : "Leadership",
    difficulty: "Medium",
    level: "Mid",
    tags: ["unique-topic"],
    type: sourceKind === "technical" ? "technical" : "behavioral",
    roleOverride: "",
    context: "any",
    followUpOf: "",
    commonMistakes: "Giving an answer without supporting reasoning.",
    normalizedQuestion: question.toLowerCase(),
    contentHash: `hash-${sourceKind}-${sourceId}`,
  };
}

function staged(record: CorpusSourceRecord): StagedCorpusRecord {
  return {
    sourceKind: record.sourceKind,
    sourceId: record.sourceId,
    contentHash: record.contentHash,
    embedding: [0.1, 0.2, 0.3],
  };
}

describe("complete corpus sync preflight", () => {
  const records = [source("technical", "T-1"), source("hr", "H-1")];

  it("accepts an exact, fully embedded stage with no retrieval history", () => {
    expect(() =>
      assertSafeCorpusSync({
        sourceRecords: records,
        stagedRecords: records.map(staged),
      })
    ).not.toThrow();
  });

  it("rejects missing embeddings, count drift, and hash drift", () => {
    expect(() =>
      assertSafeCorpusSync({
        sourceRecords: records,
        stagedRecords: [{ ...staged(records[0]), embedding: null }, staged(records[1])],
      })
    ).toThrow("missing an embedding");

    expect(() =>
      assertSafeCorpusSync({
        sourceRecords: records,
        stagedRecords: [staged(records[0])],
      })
    ).toThrow("count");

    expect(() =>
      assertSafeCorpusSync({
        sourceRecords: records,
        stagedRecords: [{ ...staged(records[0]), contentHash: "wrong" }, staged(records[1])],
      })
    ).toThrow("hashes do not exactly match");
  });
});
