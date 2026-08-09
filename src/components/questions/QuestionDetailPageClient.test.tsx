// @vitest-environment jsdom

import { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useResizableSplit", () => ({
  useResizableSplit: () => ({ percent: 42, containerRef: { current: null }, handleProps: {} }),
}));
vi.mock("@/components/questions/QuestionLeftPanel", () => ({
  QuestionLeftPanel: () => <div />,
}));
vi.mock("@/components/questions/QuestionRightPanel", () => ({
  QuestionRightPanel: () => <div />,
}));

import QuestionDetailPageClient from "./QuestionDetailPageClient";

describe("QuestionDetailPageClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads solved state once when Strict Mode replays the mount effect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ solvedQuestionIds: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <StrictMode>
        <QuestionDetailPageClient
          question={{
            id: 42,
            slug: "strict-mode-question",
            text: "Describe an important technical tradeoff.",
            category: "technical",
            difficulty: "medium",
            estimatedTime: "5 min",
            tags: [],
          }}
          currentIndex={0}
          totalQuestions={1}
          prevQuestion={null}
          nextQuestion={null}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/questions/solve", { method: "GET" });
  });
});
