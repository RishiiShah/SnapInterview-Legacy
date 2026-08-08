import { describe, expect, it } from "vitest";

import { parseCodingQuestionForm } from "./coding-question";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function publishedForm(values: Record<string, string> = {}) {
  return form({
    title: "Two Sum",
    description: "Return the two matching indexes.",
    difficulty: "easy",
    topics: "arrays",
    estimatedTime: "15 minutes",
    starterCode: JSON.stringify({ javascript: "function twoSum() {}" }),
    testCases: JSON.stringify([{ input: "[2,7,11,15], 9", expectedOutput: "[0,1]" }]),
    isPublished: "true",
    ...values,
  });
}

describe("parseCodingQuestionForm", () => {
  it("allows an incomplete draft", () => {
    const parsed = parseCodingQuestionForm(form({ title: "Draft", difficulty: "easy", isPublished: "false" }));

    expect(parsed).toMatchObject({ success: true, data: { isPublished: false, starterCode: {}, testCases: [] } });
  });

  it("requires JavaScript preview source and a public sample case before publishing", () => {
    const parsed = parseCodingQuestionForm(form({
      title: "Draft",
      description: "Implement a function.",
      difficulty: "easy",
      starterCode: JSON.stringify({ javascript: "function solve() {}" }),
      isPublished: "true",
    }));

    expect(parsed).toEqual({
      success: false,
      error: "At least one public sample case is required before publishing.",
    });
  });

  it("requires JavaScript preview source before publishing", () => {
    const parsed = parseCodingQuestionForm(form({
      title: "Python-only question",
      description: "Implement a function.",
      difficulty: "easy",
      starterCode: JSON.stringify({ python: "print('hello')" }),
      testCases: JSON.stringify([{ input: "", expectedOutput: "hello", isHidden: false }]),
      isPublished: "true",
    }));

    expect(parsed).toEqual({
      success: false,
      error: "JavaScript preview source is required before publishing.",
    });
  });

  it("rejects a published topic longer than the candidate contract allows", () => {
    const parsed = parseCodingQuestionForm(publishedForm({ topics: "a".repeat(81) }));

    expect(parsed).toEqual({ success: false, error: "Topic must be at most 80 characters." });
  });

  it("rejects a published estimated time longer than the candidate contract allows", () => {
    const parsed = parseCodingQuestionForm(publishedForm({ estimatedTime: "a".repeat(49) }));

    expect(parsed).toEqual({ success: false, error: "Estimated time must be at most 48 characters." });
  });

  it("rejects a published public sample input longer than the candidate contract allows", () => {
    const parsed = parseCodingQuestionForm(publishedForm({
      testCases: JSON.stringify([{ input: "a".repeat(50_001), expectedOutput: "ok" }]),
    }));

    expect(parsed).toEqual({ success: false, error: "Public sample input must be at most 50,000 characters." });
  });

  it("rejects a published public sample expected output longer than the candidate contract allows", () => {
    const parsed = parseCodingQuestionForm(publishedForm({
      testCases: JSON.stringify([{ input: "ok", expectedOutput: "a".repeat(50_001) }]),
    }));

    expect(parsed).toEqual({ success: false, error: "Public sample expected output must be at most 50,000 characters." });
  });

  it("accepts a published concept at every shared field limit", () => {
    const parsed = parseCodingQuestionForm(publishedForm({
      topics: Array.from({ length: 20 }, () => "a".repeat(80)).join(","),
      estimatedTime: "a".repeat(48),
      testCases: JSON.stringify([{ input: "a".repeat(50_000), expectedOutput: "a".repeat(50_000) }]),
    }));

    expect(parsed).toMatchObject({ success: true, data: { isPublished: true } });
  });

  it("treats the checked publish checkbox as true when the form also submits its false fallback", () => {
    const data = publishedForm();
    data.delete("isPublished");
    data.append("isPublished", "false");
    data.append("isPublished", "true");

    const parsed = parseCodingQuestionForm(data);

    expect(parsed).toMatchObject({ success: true, data: { isPublished: true } });
  });

  it("returns public preview cases without judge-only fields", () => {
    const parsed = parseCodingQuestionForm(form({
      title: "Two Sum",
      description: "Return the two matching indexes.",
      difficulty: "easy",
      starterCode: JSON.stringify({ javascript: "function twoSum() {}" }),
      solutionCode: JSON.stringify({ javascript: "return [0, 1];" }),
      testCases: JSON.stringify([{ input: "[2,7,11,15], 9", expectedOutput: "[0,1]", isHidden: true }]),
      isPublished: "true",
    }));

    expect(parsed).toEqual({
      success: true,
      data: expect.objectContaining({
        title: "Two Sum",
        starterCode: { javascript: "function twoSum() {}" },
        testCases: [{ input: "[2,7,11,15], 9", expectedOutput: "[0,1]" }],
      }),
    });
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("solutionCode");
      expect(parsed.data.testCases[0]).not.toHaveProperty("isHidden");
    }
  });
});
