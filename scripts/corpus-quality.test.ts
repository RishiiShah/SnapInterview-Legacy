import { describe, expect, it } from "vitest";

import {
  assertCorpusSourceCounts,
  parseCorpusSource,
  validateCorpusSource,
} from "../src/lib/rag/corpus-quality";

const HEADER =
  "Question Number,Question,Answer,Category,Difficulty,Level,Tags,Type,RoleOverride,Context,FollowUpOf,CommonMistakes";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("corpus source parsing", () => {
  it("preserves source identity and normalizes searchable fields", () => {
    const [record] = parseCorpusSource(
      csv(
        'T-001,"  What is OAuth 2.0?  ","An authorization framework.",Security,Medium,Mid,"OAuth, Web Security",technical,,,,'
      ),
      "technical"
    );

    expect(record).toMatchObject({
      sourceKind: "technical",
      sourceId: "T-001",
      question: "What is OAuth 2.0?",
      answer: "An authorization framework.",
      category: "Security",
      difficulty: "Medium",
      level: "Mid",
      tags: ["oauth", "web-security"],
      type: "technical",
      normalizedQuestion: "what is oauth 2 0",
    });
    expect(record.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reports required fields and unsupported metadata in source order", () => {
    const records = parseCorpusSource(
      csv(
        "T-001,,Answer,Security,Extreme,Wizard,,technical,,,,",
        "T-001,Valid question?,,Security,Easy,Junior,,unknown,,,,"
      ),
      "technical"
    );

    expect(validateCorpusSource(records)).toEqual([
      expect.objectContaining({ sourceKey: "technical:T-001", field: "question" }),
      expect.objectContaining({ sourceKey: "technical:T-001", field: "difficulty" }),
      expect.objectContaining({ sourceKey: "technical:T-001", field: "level" }),
      expect.objectContaining({ sourceKey: "technical:T-001", field: "sourceId" }),
      expect.objectContaining({ sourceKey: "technical:T-001", field: "answer" }),
      expect.objectContaining({ sourceKey: "technical:T-001", field: "type" }),
    ]);
  });

  it("reports normalized question hash collisions", () => {
    const records = parseCorpusSource(
      csv(
        "T-001,What is OAuth?,Answer,Security,Easy,Junior,,technical,,,,",
        "T-002,what is oauth,Answer,Security,Easy,Junior,,technical,,,,"
      ),
      "technical"
    );

    expect(validateCorpusSource(records)).toContainEqual(
      expect.objectContaining({
        sourceKey: "technical:T-002",
        field: "contentHash",
        message: expect.stringContaining("technical:T-001"),
      })
    );
  });

  it("enforces exactly 3,000 technical and 1,440 HR records", () => {
    const technical = Array.from({ length: 2 }, (_, index) => ({
      sourceKind: "technical" as const,
      sourceId: `T-${index}`,
    }));
    const hr = Array.from({ length: 1 }, (_, index) => ({
      sourceKind: "hr" as const,
      sourceId: `H-${index}`,
    }));

    expect(() => assertCorpusSourceCounts([...technical, ...hr])).toThrow(
      "Expected 3000 technical and 1440 HR questions; received 2 technical and 1 HR"
    );
  });
});
