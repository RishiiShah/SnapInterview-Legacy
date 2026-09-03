import { describe, expect, it } from "vitest";

import { formatRetrievedQuestions } from "./retrieval-format";

describe("formatRetrievedQuestions", () => {
  it("uses common mistakes as evidence-aware probes, not automatic penalties", () => {
    const formatted = formatRetrievedQuestions([
      {
        id: "q-1",
        sourceId: "42",
        question: "How should passwords be salted?",
        answer: "Use a unique random salt per password.",
        commonMistakes: "Using one global salt.",
        category: "Security",
        difficulty: "medium",
        level: "mid",
        similarity: 0.9,
      },
    ]);

    expect(formatted).toContain("Common mistakes to probe for: Using one global salt.");
    expect(formatted).toContain(
      "Do not assume or penalize a mistake unless the candidate actually demonstrates it."
    );
  });
});
