// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminCodingFields } from "./AdminCodingFields";

describe("AdminCodingFields", () => {
  it("renders JavaScript preview and public sample authoring without judge controls", () => {
    const { container } = render(<AdminCodingFields />);

    expect(screen.getByText("JavaScript Preview Source")).toBeTruthy();
    expect(screen.getByText("Public Sample Cases")).toBeTruthy();
    expect(screen.queryByText("Solution Code")).toBeNull();
    expect(screen.queryByText("Hidden")).toBeNull();
    expect(container.querySelector('input[name="solutionCode"]')).toBeNull();
  });
});
