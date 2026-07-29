import { describe, it, expect } from "vitest";
import { parseCodingChallenge } from "./coding-challenge";

const VALID_BLOCK = [
  "Here is your coding challenge:",
  "",
  "**Two Sum**",
  "",
  "Given an array of integers...",
  "",
  "```coding-challenge",
  JSON.stringify({
    starterCode: {
      javascript: 'function twoSum(nums, target) {\n  // TODO\n}\nconsole.log(JSON.stringify(twoSum(nums, target)));',
      python: 'def two_sum(nums, target):\n    pass\nprint(two_sum(nums, target))',
    },
    testCases: [
      { input: "[2,7,11,15]\n9", expectedOutput: "[0,1]", isHidden: false },
      { input: "[3,3]\n6", expectedOutput: "[0,1]", isHidden: true },
    ],
  }),
  "```",
].join("\n");

describe("parseCodingChallenge", () => {
  it("extracts challenge and strips block from message", () => {
    const result = parseCodingChallenge(VALID_BLOCK);
    expect(result).not.toBeNull();
    expect(result!.challenge.starterCode.javascript).toContain("twoSum");
    expect(result!.challenge.starterCode.python).toContain("two_sum");
    expect(result!.challenge.testCases).toHaveLength(2);
    expect(result!.challenge.testCases[0].isHidden).toBe(false);
    expect(result!.challenge.testCases[1].isHidden).toBe(true);
    expect(result!.displayText).not.toContain("coding-challenge");
    expect(result!.displayText).toContain("Two Sum");
  });

  it("returns null for messages without a coding-challenge block", () => {
    expect(parseCodingChallenge("Just a regular AI message.")).toBeNull();
  });

  it("returns null for malformed JSON inside the block", () => {
    const bad = "```coding-challenge\n{not valid json\n```";
    expect(parseCodingChallenge(bad)).toBeNull();
  });

  it("returns null when starterCode is missing", () => {
    const noStarter = '```coding-challenge\n{"testCases":[]}\n```';
    expect(parseCodingChallenge(noStarter)).toBeNull();
  });

  it("returns null when testCases is missing", () => {
    const noTests = '```coding-challenge\n{"starterCode":{"javascript":"x"}}\n```';
    expect(parseCodingChallenge(noTests)).toBeNull();
  });
});
