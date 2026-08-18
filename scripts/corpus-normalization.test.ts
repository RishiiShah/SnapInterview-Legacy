import { describe, expect, it } from "vitest";
import { dedupeByNormalizedQuestion, normalizeCorpusQuestion } from "../src/lib/rag/corpus-normalization";

describe("corpus-normalization", () => {
  it("normalizes casing, punctuation, and multiple spaces", () => {
    expect(normalizeCorpusQuestion("  What is   OAuth 2.0?  ")).toBe("what is oauth 2 0");
  });

  it("normalizes punctuation and prefers the duplicate with an answer", () => {
    const result = dedupeByNormalizedQuestion([
      { question: "What is OAuth?", answer: null },
      { question: "what is oauth", answer: "A protocol." },
    ]);

    expect(result).toEqual({
      unique: [{ question: "what is oauth", answer: "A protocol." }],
      dropped: 1,
    });
  });

  it("keeps the earlier record when neither or both have an answer", () => {
    const result = dedupeByNormalizedQuestion([
      { question: "What is Docker?", answer: "First answer" },
      { question: "what is docker", answer: "Second answer" },
    ]);

    expect(result).toEqual({
      unique: [{ question: "What is Docker?", answer: "First answer" }],
      dropped: 1,
    });
  });
});
