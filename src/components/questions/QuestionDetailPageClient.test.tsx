// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  questionLeftPanel: vi.fn(),
  questionRightPanel: vi.fn(),
}));

vi.mock("@/hooks/useResizableSplit", () => ({
  useResizableSplit: () => ({ percent: 42, containerRef: { current: null }, handleProps: {} }),
}));
vi.mock("@/components/questions/QuestionLeftPanel", () => ({
  QuestionLeftPanel: (props: unknown) => {
    mocks.questionLeftPanel(props);
    return <div />;
  },
}));
vi.mock("@/components/questions/QuestionRightPanel", () => ({
  QuestionRightPanel: (props: unknown) => {
    mocks.questionRightPanel(props);
    return <div />;
  },
}));

import QuestionDetailPageClient from "./QuestionDetailPageClient";

describe("QuestionDetailPageClient", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    mocks.questionLeftPanel.mockClear();
    mocks.questionRightPanel.mockClear();
  });

  it("uses the server-provided solved state without fetching after hydration", async () => {
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
          initialIsSolved={false}
        />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(0);
    });
  });

  it("restores an in-progress answer locally without a network request", async () => {
    localStorage.setItem(
      "snap-question-answer-draft-v1:questions:42",
      JSON.stringify({ answerText: "I would first clarify the trade-off.", timeRemaining: 245 }),
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
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
        initialIsSolved={false}
      />,
    );

    await waitFor(() => {
      expect(mocks.questionRightPanel).toHaveBeenLastCalledWith(
        expect.objectContaining({
          answerText: "I would first clarify the trade-off.",
          isTimerStarted: true,
          timeRemaining: 245,
        }),
      );
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the intended solved state instead of relying on a server-side toggle", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ solved: true, questionId: 42 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
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
        initialIsSolved={false}
      />,
    );

    const latestProps = mocks.questionLeftPanel.mock.lastCall?.[0] as {
      handleToggleSolved: () => void;
    };
    latestProps.handleToggleSolved();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/questions/solve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ questionId: 42, solved: true }),
      }),
    );
  });
});
