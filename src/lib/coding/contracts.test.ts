import { describe, expect, it } from "vitest";

import {
  CodingQuestionSchema,
  CodingStarterCodeSchema,
  SupportedLanguageSchema,
} from "./contracts";

describe("coding contracts", () => {
  it("accepts only the language shown in the concept preview", () => {
    expect(SupportedLanguageSchema.safeParse("javascript").success).toBe(true);
    expect(SupportedLanguageSchema.safeParse("python").success).toBe(false);
    expect(SupportedLanguageSchema.safeParse("cpp").success).toBe(false);
  });

  it("rejects an unsupported language", () => {
    expect(SupportedLanguageSchema.safeParse("ruby").success).toBe(false);
  });

  it("requires non-empty JavaScript preview source", () => {
    expect(CodingStarterCodeSchema.safeParse({ javascript: "" }).success).toBe(false);
    expect(CodingStarterCodeSchema.safeParse({ javascript: "console.log(input);" }).success).toBe(true);
    expect(CodingStarterCodeSchema.safeParse({ python: "print(input)" }).success).toBe(false);
  });

  it("exposes only public samples without a solved state in the concept workspace", () => {
    const parsed = CodingQuestionSchema.safeParse({
      id: "coding-1",
      slug: "sum-pair",
      title: "Sum Pair",
      description: "Print the sum.",
      constraints: null,
      difficulty: "easy",
      topics: ["arrays"],
      estimatedTime: null,
      hint: null,
      starterCode: { javascript: "console.log(input);" },
      sampleTestCases: [{ ordinal: 1, input: "1 2", expectedOutput: "3" }],
      solved: false,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.sampleTestCases[0]).not.toHaveProperty("isHidden");
    expect(parsed.data).not.toHaveProperty("solved");
  });
});
