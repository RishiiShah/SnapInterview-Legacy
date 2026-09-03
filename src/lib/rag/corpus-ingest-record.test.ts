import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { parseCorpusSource, type CorpusSourceRecord } from "./corpus-quality";
import { toCorpusRecord } from "./corpus-ingest-record";

describe("toCorpusRecord", () => {
  it("keeps the original question number and common mistakes", () => {
    const source: CorpusSourceRecord = {
      sourceKind: "technical",
      sourceId: "4440",
      question: "How should passwords be salted?",
      answer: "Use a unique random salt per password.",
      category: "Security",
      difficulty: "Medium",
      level: "Mid",
      tags: ["passwords", "security"],
      type: "technical",
      roleOverride: "",
      context: "any",
      followUpOf: "",
      commonMistakes: "Using one global salt or treating a salt as a secret.",
      normalizedQuestion: "how should passwords be salted",
      contentHash: "hash-4440",
    };

    const mapped = toCorpusRecord(source, "technical-questions");

    expect(mapped.sourceId).toBe("4440");
    expect(mapped.commonMistakes).toBe(
      "Using one global salt or treating a salt as a secret."
    );
  });

  it("keeps question numbers and common mistakes for all 4,440 source rows", async () => {
    const [technicalCsv, hrCsv] = await Promise.all([
      readFile(
        path.join(process.cwd(), "src/data/corpus/technical-questions.csv"),
        "utf8"
      ),
      readFile(
        path.join(process.cwd(), "src/data/corpus/hr-questions.csv"),
        "utf8"
      ),
    ]);
    const records = [
      ...parseCorpusSource(technicalCsv, "technical"),
      ...parseCorpusSource(hrCsv, "hr"),
    ];
    const mapped = records.map((record) =>
      toCorpusRecord(record, `${record.sourceKind}-questions`)
    );

    expect(mapped).toHaveLength(4440);
    expect(mapped.every((record) => Boolean(record.sourceId))).toBe(true);
    expect(mapped.every((record) => Boolean(record.commonMistakes))).toBe(true);
    expect(
      new Set(mapped.map((record) => `${record.source}:${record.sourceId}`)).size
    ).toBe(4440);
  });
});
