// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AdminQuestionForm } from "./AdminQuestionForm";

describe("AdminQuestionForm", () => {
  it("offers exactly the four allowed Q&A categories", () => {
    render(<AdminQuestionForm mode="create" action={vi.fn()} />);

    const category = screen.getByLabelText("Category");

    expect(within(category).getAllByRole("option").map((option) => option.getAttribute("value"))).toEqual([
      "behavioral",
      "technical",
      "system-design",
      "leadership",
    ]);
  });
});
