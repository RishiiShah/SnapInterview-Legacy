import { describe, expect, it } from "vitest";
import {
  getQuestionCountRangeForDuration,
  getRandomQuestionCountForDuration,
  interviewQuestionCountSchema,
} from "./domain";

describe("getQuestionCountRangeForDuration", () => {
  it("returns [5, 8] for 15-minute duration", () => {
    expect(getQuestionCountRangeForDuration(15)).toEqual({ min: 5, max: 8 });
  });

  it("returns [10, 13] for 30-minute duration", () => {
    expect(getQuestionCountRangeForDuration(30)).toEqual({ min: 10, max: 13 });
  });

  it("returns [15, 18] for 45-minute duration", () => {
    expect(getQuestionCountRangeForDuration(45)).toEqual({ min: 15, max: 18 });
  });
});

describe("getRandomQuestionCountForDuration", () => {
  it("always returns an integer between 5 and 8 inclusive for 15 min", () => {
    for (let i = 0; i < 100; i++) {
      const count = getRandomQuestionCountForDuration(15);
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(8);
      expect(Number.isInteger(count)).toBe(true);
    }
  });

  it("always returns an integer between 10 and 13 inclusive for 30 min", () => {
    for (let i = 0; i < 100; i++) {
      const count = getRandomQuestionCountForDuration(30);
      expect(count).toBeGreaterThanOrEqual(10);
      expect(count).toBeLessThanOrEqual(13);
      expect(Number.isInteger(count)).toBe(true);
    }
  });

  it("always returns an integer between 15 and 18 inclusive for 45 min", () => {
    for (let i = 0; i < 100; i++) {
      const count = getRandomQuestionCountForDuration(45);
      expect(count).toBeGreaterThanOrEqual(15);
      expect(count).toBeLessThanOrEqual(18);
      expect(Number.isInteger(count)).toBe(true);
    }
  });
});

describe("interviewQuestionCountSchema", () => {
  it("accepts all valid question counts in the ranges", () => {
    const validCounts = [5, 6, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18];
    for (const count of validCounts) {
      expect(interviewQuestionCountSchema.safeParse(count).success).toBe(true);
    }
  });

  it("rejects invalid question counts outside the defined ranges", () => {
    const invalidCounts = [0, 4, 9, 14, 19, 25, -1];
    for (const count of invalidCounts) {
      expect(interviewQuestionCountSchema.safeParse(count).success).toBe(false);
    }
  });
});
