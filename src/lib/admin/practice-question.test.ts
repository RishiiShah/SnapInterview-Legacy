import { describe, expect, it } from "vitest";

import { parsePracticeQuestionInput } from "./practice-question";

function input(category: string) {
  return {
    text: "Tell me about a difficult project.",
    category,
    difficulty: "medium",
  };
}

describe("parsePracticeQuestionInput", () => {
  it.each(["behavioral", "technical", "system-design", "leadership"])(
    "accepts the %s Q&A category",
    (category) => {
      expect(parsePracticeQuestionInput(input(category))).toMatchObject({
        success: true,
        data: { category },
      });
    },
  );

  it.each(["coding", "coding-algorithms", "recruiter-screen", "take-home"])(
    "rejects the %s live interview or coding category",
    (category) => {
      expect(parsePracticeQuestionInput(input(category))).toMatchObject({ success: false });
    },
  );
});
