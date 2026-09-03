import { describe, expect, it } from "vitest";

import { buildTsQueryString } from "./hybrid";

describe("buildTsQueryString", () => {
  it("keeps normal conversational sparse terms conjunctive", () => {
    const query = buildTsQueryString(
      "Redux Toolkit React Window selector subscriptions virtualization"
    );

    expect(query).not.toContain(" OR ");
  });

  it("supports OR semantics for a focused gap-fill query", () => {
    const query = buildTsQueryString(
      "Redux Window selector virtualization",
      true
    );

    expect(query).toContain(" OR ");
    expect(query).toContain("Redux");
    expect(query).toContain("Window");
  });
});
