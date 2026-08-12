// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("SearchModal", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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
    const interviewId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    vi.mocked(fetch).mockResolvedValue(mockSearchResponse({
      sessions: [{
        id: interviewId,
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
        type: "text",
      }],
    }));

    render(<SearchModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/search interviews/i), {
      target: { value: "react" },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/search?q=react",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
    expect(screen.getByText("Frontend Developer · OpenAI")).not.toBeNull();
    expect(screen.getByRole("link", { name: /Frontend Developer/i }).getAttribute("href")).toBe(`/recordings?interviewId=${interviewId}`);
    expect(screen.getByText("Technical")).not.toBeNull();
    expect(screen.getByText("Explain React state updates")).not.toBeNull();
    expect(screen.getByRole("link", { name: /Explain React state updates/i }).getAttribute("href")).toBe("/questions/react-state");
    expect(screen.getByText("Medium")).not.toBeNull();
  });

  it("routes coding questions to /coding", async () => {
    vi.mocked(fetch).mockResolvedValue(mockSearchResponse({
      sessions: [],
      questions: [{
        id: 2,
        slug: "two-sum",
        text: "Two Sum",
        category: null,
        difficulty: "Easy",
        type: "coding",
      }],
    }));

    render(<SearchModal onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/search interviews/i), {
      target: { value: "two" },
    });

    await waitFor(() => {
      expect(screen.getByText("Two Sum")).not.toBeNull();
    });
    expect(screen.getByRole("link", { name: /Two Sum/i }).getAttribute("href")).toBe("/coding/two-sum");
  });

  it("does not route a Q&A result through coding based on a legacy category", async () => {
    vi.mocked(fetch).mockResolvedValue(mockSearchResponse({
      sessions: [],
      questions: [{
        id: 3,
        slug: "legacy-category",
        text: "Legacy category question",
        category: "coding",
        difficulty: "Easy",
        type: "question",
      }],
    }));

    render(<SearchModal onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/search interviews/i), {
      target: { value: "legacy" },
    });

    await waitFor(() => {
      expect(screen.getByText("Legacy category question")).not.toBeNull();
    });
    expect(screen.getByRole("link", { name: /Legacy category question/i }).getAttribute("href"))
      .toBe("/questions/legacy-category");
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

  it("keeps newer search results when an older request resolves last", async () => {
    vi.useFakeTimers();
    const olderResponse = deferred<Response>();
    const newerResponse = deferred<Response>();
    vi.mocked(fetch)
      .mockReturnValueOnce(olderResponse.promise)
      .mockReturnValueOnce(newerResponse.promise);

    render(<SearchModal onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText(/search interviews/i);

    fireEvent.change(input, { target: { value: "react" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    fireEvent.change(input, { target: { value: "next" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      newerResponse.resolve(mockSearchResponse({
        sessions: [],
        questions: [{
          id: "newer",
          slug: "newer-result",
          text: "Newer result",
          category: "technical",
          difficulty: "Easy",
          type: "question",
        }],
      }));
      await Promise.resolve();
    });
    expect(screen.getByText("Newer result")).not.toBeNull();

    await act(async () => {
      olderResponse.resolve(mockSearchResponse({
        sessions: [],
        questions: [{
          id: "older",
          slug: "older-result",
          text: "Older result",
          category: "technical",
          difficulty: "Easy",
          type: "question",
        }],
      }));
      await Promise.resolve();
    });

    expect(screen.getByText("Newer result")).not.toBeNull();
    expect(screen.queryByText("Older result")).toBeNull();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<SearchModal onClose={onClose} />);
    const backdrop = container.querySelector('[class*="bg-[#090A0F]"]');

    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
