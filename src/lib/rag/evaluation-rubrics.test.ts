import { describe, expect, it } from "vitest";

import { formatMatchedEvaluationRubrics } from "./evaluation-rubrics";

describe("formatMatchedEvaluationRubrics", () => {
  it("selects the closest retrieved rubric for each asked question", () => {
    const formatted = formatMatchedEvaluationRubrics(
      [
        {
          order: 0,
          question: "How would you salt and hash a user's password securely?",
          answer: "I would use bcrypt with a random salt for each password.",
        },
      ],
      [
        {
          questionOrder: 0,
          question: {
            sourceId: "81",
            question: "How should user passwords be salted and hashed?",
            answer: "Use a unique random salt and a password KDF.",
            commonMistakes: "Using one global salt; using a fast general-purpose hash.",
          },
        },
        {
          questionOrder: 0,
          question: {
            sourceId: "82",
            question: "How does a browser render CSS?",
            answer: "It builds the CSSOM.",
            commonMistakes: "Confusing the DOM and CSSOM.",
          },
        },
      ]
    );

    expect(formatted).toContain("Source question 81");
    expect(formatted).toContain("Using one global salt");
    expect(formatted).not.toContain("Source question 82");
    expect(formatted).toContain("Only count a common mistake when the candidate's answer demonstrates it");
  });

  it("omits rubrics when no retrieved question clearly matches", () => {
    const formatted = formatMatchedEvaluationRubrics(
      [{ order: 0, question: "Tell me about mentoring a teammate.", answer: "I set weekly goals." }],
      [
        {
          questionOrder: 0,
          question: {
            sourceId: "90",
            question: "Explain database transaction isolation levels.",
            answer: "Read committed prevents dirty reads.",
            commonMistakes: "Confusing repeatable read with serializable.",
          },
        },
      ]
    );

    expect(formatted).toBe("");
  });
});
