// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CodingWorkspacePageClient } from "./CodingWorkspacePageClient";

const editorSpy = vi.fn();

afterEach(() => {
  cleanup();
  editorSpy.mockClear();
});

vi.mock("@monaco-editor/react", () => ({
  default: (props: unknown) => {
    editorSpy(props);
    return <div aria-label="JavaScript preview" />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const question = {
  id: "coding-1",
  slug: "sum-pair",
  title: "Sum Pair",
  description: "Print the sum of two values.",
  constraints: "Numbers fit in a signed integer.",
  difficulty: "easy",
  topics: ["arrays"],
  estimatedTime: "15 min",
  hint: "Add the two values.",
  starterCode: { javascript: "console.log(input);" },
  sampleTestCases: [{ ordinal: 1, input: "1 2", expectedOutput: "3" }],
};

describe("CodingWorkspacePageClient", () => {
  it("renders an honest read-only JavaScript concept preview with public samples", () => {
    render(<CodingWorkspacePageClient question={question} />);

    expect(screen.getByText("Concept preview")).not.toBeNull();
    expect(screen.getByText("Execution and submission are not included.")).not.toBeNull();
    expect(screen.getByText("Sample 1")).not.toBeNull();
    expect(screen.getByText("Input")).not.toBeNull();
    expect(screen.getByText("1 2")).not.toBeNull();
    expect(screen.getByText("Expected output")).not.toBeNull();
    expect(screen.getByText("3")).not.toBeNull();
    expect(editorSpy).toHaveBeenCalledWith(expect.objectContaining({
      language: "javascript",
      value: "console.log(input);",
      options: expect.objectContaining({ readOnly: true }),
    }));
  });

  it("does not expose execution, grading, or progress controls", () => {
    render(<CodingWorkspacePageClient question={question} />);

    for (const control of ["Run", "Submit", "Reset", "Test Result", "Verdict", "Solved", "History"]) {
      expect(screen.queryByRole("button", { name: control })).toBeNull();
      expect(screen.queryByText(control, { exact: true })).toBeNull();
    }
  });
});
