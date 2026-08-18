import { describe, expect, it } from "vitest";
import { companyPackSchema } from "./index";

const validPack = {
  id: "example",
  version: 1,
  displayNames: ["Example Corp"],
  method: ["Evaluate clear reasoning and sound technical judgment."],
  signalsByLevel: {
    "mid-level": ["Owns production features."],
  },
  signalsByRoleFamily: {
    swe: ["Writes maintainable code."],
  },
  frequentThemes: [
    {
      id: "example-theme",
      shape: "Design a reliable service.",
      types: ["system-design"],
    },
  ],
  sourcesNote: "Example rubric",
};

describe("companyPackSchema", () => {
  it("accepts a complete valid company pack", () => {
    expect(companyPackSchema.parse(validPack)).toEqual(validPack);
  });

  it("rejects a pack whose method is not an array of strings", () => {
    expect(() => companyPackSchema.parse({ ...validPack, method: "Evaluate candidates." })).toThrow();
  });
});
