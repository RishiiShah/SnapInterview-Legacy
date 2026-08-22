import { describe, expect, it } from "vitest";
import {
  dedupeByNormalizedQuestion,
  dropNearDuplicateQuestions,
  normalizeCorpusQuestion,
  parseCorpusTags,
} from "../src/lib/rag/corpus-normalization";

describe("corpus-normalization", () => {
  it("parses CSV Tags into normalized keyword tokens", () => {
    expect(parseCorpusTags("react,performance,dom,virtualization")).toEqual([
      "react",
      "performance",
      "dom",
      "virtualization",
    ]);
    expect(parseCorpusTags("  Kafka; Redis | Postgres ")).toEqual(["kafka", "redis", "postgres"]);
    expect(parseCorpusTags("")).toEqual([]);
    expect(parseCorpusTags(null)).toEqual([]);
  });

  it("drops near-duplicate questions while preferring answers", () => {
    const result = dropNearDuplicateQuestions([
      {
        question: "How do you collaborate with a data science team that had different practices?",
        answer: null,
      },
      {
        question: "Describe collaborating with a data science team that had different practices.",
        answer: "Align on SLAs and shared rituals.",
      },
      {
        question: "What is a Redis lock?",
        answer: "A distributed mutex.",
      },
    ], 0.5);

    expect(result.dropped).toBe(1);
    expect(result.unique).toHaveLength(2);
    expect(result.unique.some((r) => r.answer?.includes("SLAs"))).toBe(true);
  });

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
