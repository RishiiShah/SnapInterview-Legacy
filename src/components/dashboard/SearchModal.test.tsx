// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchModal } from "./SearchModal";

vi.mock("next/link", () => ({
  default: ({ href, children, onClick, className }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

function mockSearchResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SearchModal", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("filters static navigation items and skips API calls for one-character queries", async () => {
    render(<SearchModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/search interviews/i), {
      target: { value: "x" },
    });

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/search interviews/i), {
      target: { value: "settings" },
    });

    expect(screen.getByText("Settings")).not.toBeNull();
    expect(screen.queryByText("Dashboard")).toBeNull();
  });

  it("debounces API search and renders dynamic session and question results", async () => {
    vi.mocked(fetch).mockResolvedValue(mockSearchResponse({
      sessions: [{
        id: "session-1",
        role: "Frontend Developer",
        company: "OpenAI",
        type: "technical",
        difficulty: "hard",
        createdAt: "2026-01-01T00:00:00.000Z",
      }],
      questions: [{
        id: 1,
        slug: "react-state",
        text: "Explain React state updates",
        category: "technical",
        difficulty: "Medium",
      }],
    }));

    render(<SearchModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/search interviews/i), {
      target: { value: "react" },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/search?q=react");
    });
    expect(screen.getByText("Frontend Developer — OpenAI")).not.toBeNull();
    expect(screen.getByText("Technical")).not.toBeNull();
    expect(screen.getByText("Explain React state updates")).not.toBeNull();
    expect(screen.getByText("Medium")).not.toBeNull();
  });

  it("renders an empty state when no static or dynamic results match", async () => {
    vi.mocked(fetch).mockResolvedValue(mockSearchResponse({
      sessions: [],
      questions: [],
    }));

    render(<SearchModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/search interviews/i), {
      target: { value: "zzzzzz" },
    });

    await waitFor(() => {
      expect(screen.getByText("No results found")).not.toBeNull();
    });
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<SearchModal onClose={onClose} />);
    const backdrop = container.querySelector('[class*="bg-zinc-900"]');

    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
