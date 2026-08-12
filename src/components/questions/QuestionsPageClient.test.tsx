// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/motion", () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SlideIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/questions/QuestionsFilterBar", () => ({
  default: (props: {
    activeFilterCount: number;
    setSolvedStatus?: (value: "all" | "solved" | "unsolved") => void;
  }) => (
    <div>
      <span data-testid="active-filter-count">{props.activeFilterCount}</span>
      <button type="button" onClick={() => props.setSolvedStatus?.("unsolved")}>Show unsolved</button>
      <button type="button" onClick={() => props.setSolvedStatus?.("solved")}>Show solved</button>
    </div>
  ),
}));

vi.mock("@/components/questions/QuestionsTable", () => ({
  default: ({ filtered }: { filtered: Array<{ slug: string }> }) => (
    <ul>
      {filtered.map((question) => <li key={question.slug}>{question.slug}</li>)}
    </ul>
  ),
}));

import QuestionsPageClient from "./QuestionsPageClient";

const questions = [
  {
    id: 1,
    slug: "solved-question",
    text: "Describe a completed project.",
    category: "behavioral" as const,
    difficulty: "easy" as const,
    estimatedTime: "5 min",
    tags: [],
  },
  {
    id: 2,
    slug: "unsolved-question",
    text: "Design a rate limiter.",
    category: "system-design" as const,
    difficulty: "medium" as const,
    estimatedTime: "10 min",
    tags: [],
  },
];

describe("QuestionsPageClient", () => {
  it("filters the existing question catalog by solved status without a network request", () => {
    render(<QuestionsPageClient initialSolvedIds={[1]} questions={questions} />);

    expect(screen.getByText("solved-question")).toBeTruthy();
    expect(screen.getByText("unsolved-question")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show unsolved" }));

    expect(screen.queryByText("solved-question")).toBeNull();
    expect(screen.getByText("unsolved-question")).toBeTruthy();
    expect(screen.getByTestId("active-filter-count").textContent).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Show solved" }));

    expect(screen.getByText("solved-question")).toBeTruthy();
    expect(screen.queryByText("unsolved-question")).toBeNull();
  });
});
