// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DimensionAnalytics from "./DimensionAnalytics";

vi.mock("@/components/ui/motion", () => ({
  FadeInStagger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  FadeInStaggerItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

describe("DimensionAnalytics", () => {
  it("renders empty dimension trends when a stale analytics payload omits them", () => {
    render(
      <DimensionAnalytics
        subScores={{ communication: null, technicalDepth: null, clarity: null }}
        subScoreTrends={undefined as never}
      />,
    );

    expect(screen.getAllByText("No rubric data in this range yet.")).toHaveLength(3);
  });
});
