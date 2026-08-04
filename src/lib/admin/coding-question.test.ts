import { describe, expect, it } from "vitest";

import { parseCodingQuestionForm } from "./coding-question";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("parseCodingQuestionForm", () => {
  it("allows an incomplete draft", () => {
    const parsed = parseCodingQuestionForm(form({ title: "Draft", difficulty: "easy", isPublished: "false" }));

    expect(parsed).toMatchObject({ success: true, data: { isPublished: false, starterCode: {}, testCases: [] } });
  });

  it("requires runnable source and a testcase before publishing", () => {
    const parsed = parseCodingQuestionForm(form({ title: "Draft", difficulty: "easy", isPublished: "true" }));

    expect(parsed).toMatchObject({ success: false });
  });
});
