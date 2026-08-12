import { describe, expect, it } from "vitest";
import { parsePracticeRetakeDefaults } from "./retake-defaults";

describe("parsePracticeRetakeDefaults", () => {
  it("preserves explicit retake values that match default form values", () => {
    expect(parsePracticeRetakeDefaults({
      role: "Frontend Developer",
      type: "behavioral",
      difficulty: "medium",
    })).toEqual({
      role: "Frontend Developer",
      type: "behavioral-leadership",
      difficulty: "medium",
    });
  });

  it("accepts supported interview types beyond the baseline practice default", () => {
    expect(parsePracticeRetakeDefaults({
      role: "Engineering Manager",
      type: "leadership",
      difficulty: "hard",
    })).toEqual({
      role: "Engineering Manager",
      type: "behavioral-leadership",
      difficulty: "hard",
    });
  });

  it("uses the first repeated param and ignores invalid values", () => {
    expect(parsePracticeRetakeDefaults({
      role: ["Product Manager", "Backend Developer"],
      type: ["invalid", "technical"],
      difficulty: ["extreme", "easy"],
    })).toEqual({
      role: "Product Manager",
    });
  });

  it("accepts new hiring-loop kinds directly", () => {
    expect(parsePracticeRetakeDefaults({
      type: "bar-raiser",
      difficulty: "hard",
    })).toEqual({
      type: "bar-raiser",
      difficulty: "hard",
    });
  });
});
