// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceTrendChart from "./PerformanceTrendChart";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

describe("PerformanceTrendChart", () => {
  it("renders an empty state when a stale analytics payload omits trend series", () => {
    render(
      <PerformanceTrendChart
        dailyTrend={undefined as never}
        weeklyTrend={undefined as never}
        monthlyTrend={undefined as never}
      />,
    );

    expect(screen.getByText("No scored interviews in this range yet. Complete a mock to see your trend.")).toBeDefined();
  });
});
