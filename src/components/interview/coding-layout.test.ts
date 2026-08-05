import { describe, expect, it } from "vitest";

import { shouldUseCodingLayout } from "./ActiveInterviewScreen";

describe("shouldUseCodingLayout", () => {
  it("keeps the coding room layout while the first challenge is still streaming", () => {
    expect(shouldUseCodingLayout(true, null)).toBe(true);
  });

  it("uses the coding room layout when a legacy session has already parsed a challenge", () => {
    expect(shouldUseCodingLayout(false, {
      starterCode: { javascript: "console.log('ready')" },
      testCases: [],
    })).toBe(true);
  });
});
