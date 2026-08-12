// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CodingCatalogPageClient } from "./CodingCatalogPageClient";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe("CodingCatalogPageClient", () => {
  it("describes concepts without showing solved progress", () => {
    render(<CodingCatalogPageClient questions={[{
      id: "coding-1",
      slug: "sum-pair",
      title: "Sum Pair",
      difficulty: "easy",
      topics: ["arrays"],
      estimatedTime: "15 min",
    }]} />);

    expect(screen.getByText("Coding concepts")).not.toBeNull();
    expect(screen.getByText("Explore conceptual workspaces with read-only JavaScript previews and public sample cases.")).not.toBeNull();
    expect(screen.queryByText("Solved", { exact: true })).toBeNull();
  });
});
