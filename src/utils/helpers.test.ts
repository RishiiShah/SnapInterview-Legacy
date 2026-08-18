import { describe, expect, it } from "vitest";
import { getInitials, getScoreLabel } from "./helpers";

describe("helpers", () => {
  it.each([
    [69, "Needs Work"],
    [70, "Good"],
    [79, "Good"],
    [80, "Great"],
  ])("labels score %d", (score, expected) => {
    expect(getScoreLabel(score)).toBe(expected);
  });

  it("returns at most two uppercase initials", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
    expect(getInitials("Prince")).toBe("P");
  });
});
