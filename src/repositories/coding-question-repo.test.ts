import { describe, expect, it } from "vitest";

import { toCodingWorkspaceQuestion } from "./coding-question-repo";

describe("toCodingWorkspaceQuestion", () => {
  it("shapes public samples without exposing hidden tests or admin solution code", () => {
    const workspace = toCodingWorkspaceQuestion({
      id: "coding-1",
      slug: "sum-pair",
      title: "Sum Pair",
      description: "Print the pair.",
      constraints: null,
      difficulty: "easy",
      topics: ["arrays"],
      estimatedTime: "15 min",
      hint: null,
      starterCode: { javascript: "console.log(input);" },
      solutionCode: { javascript: "console.log('answer');" },
      testCases: [
        { ordinal: 1, input: "1 2", expectedOutput: "3", isHidden: false },
        { ordinal: 2, input: "99 1", expectedOutput: "100", isHidden: true },
      ],
      solvedBy: [{ userId: "user-1" }],
    });

    expect(workspace).toMatchObject({
      slug: "sum-pair",
      solved: true,
      sampleTestCases: [{ ordinal: 1, expectedOutput: "3" }],
    });
    expect(workspace).not.toHaveProperty("solutionCode");
    expect(workspace).not.toHaveProperty("testCases");
  });
});
