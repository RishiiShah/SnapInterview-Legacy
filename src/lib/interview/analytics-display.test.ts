import { describe, expect, it } from "vitest";

import { formatMonthBucketRange, formatMonthOverMonthChange } from "./analytics-display";

describe("formatMonthOverMonthChange", () => {
  it("labels first activity as new instead of 0%", () => {
    expect(formatMonthOverMonthChange(1, 0).label).toBe("New this month");
    expect(formatMonthOverMonthChange(70, 0).tone).toBe("new");
  });

  it("computes percent change when prior month had data", () => {
    expect(formatMonthOverMonthChange(8, 4).label).toBe("↑ 100% vs last month");
    expect(formatMonthOverMonthChange(2, 4).label).toBe("↓ 50% vs last month");
  });

  it("handles flat and empty months", () => {
    expect(formatMonthOverMonthChange(0, 0).label).toBe("No activity last month");
    expect(formatMonthOverMonthChange(5, 5).label).toBe("Flat vs last month");
  });
});

describe("formatMonthBucketRange", () => {
  it("returns short month name only", () => {
    const march = new Date(2026, 2, 1);
    expect(formatMonthBucketRange(march)).toBe("Mar");
    expect(formatMonthBucketRange(new Date(2026, 7, 1))).toBe("Aug");
  });
});
