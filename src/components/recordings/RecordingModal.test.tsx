// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecordingModal from "./RecordingModal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/ui/ModalPortal", () => ({
  default: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="modal-portal">{children}</div> : null,
}));

describe("RecordingModal", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("never calls evaluate API when opening a session without evaluation", async () => {
    const interviewId = "test-interview-without-eval";

    fetchMock.mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr === `/api/interview/${interviewId}`) {
        return new Response(
          JSON.stringify({
            id: interviewId,
            role: "Software Engineer",
            company: "Google",
            type: "coding-algorithms",
            difficulty: "medium",
            transcript: [],
            evaluation: null,
            feedback: [],
            createdAt: "2026-09-03T12:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (urlStr === `/api/interview/${interviewId}/share`) {
        return new Response(JSON.stringify({ shareToken: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch URL: ${urlStr}`);
    });

    render(
      <RecordingModal
        isOpen={true}
        onClose={vi.fn()}
        videoUrl=""
        interviewId={interviewId}
        videoDate="03 Sep 2026, 12:00 PM"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Evaluation is not available for this interview yet.")).toBeTruthy();
    });

    const evaluateCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/interview/evaluate"),
    );
    expect(evaluateCalls).toHaveLength(0);
  });

  it("displays existing evaluation and does not trigger evaluate", async () => {
    const interviewId = "test-interview-with-eval";

    fetchMock.mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr === `/api/interview/${interviewId}`) {
        return new Response(
          JSON.stringify({
            id: interviewId,
            role: "Backend Engineer",
            company: "Stripe",
            type: "domain-role",
            difficulty: "hard",
            transcript: [{ id: "t-1", order: 0, question: "Q1", answer: "A1" }],
            evaluation: {
              score: 88,
              feedback: "Strong fundamentals and trade-off analysis.",
              strengths: ["Clear data modeling"],
              areasForImprovement: ["Consider cache invalidation strategies"],
            },
            feedback: [],
            createdAt: "2026-09-03T12:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (urlStr === `/api/interview/${interviewId}/share`) {
        return new Response(JSON.stringify({ shareToken: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch URL: ${urlStr}`);
    });

    render(
      <RecordingModal
        isOpen={true}
        onClose={vi.fn()}
        videoUrl=""
        interviewId={interviewId}
        videoDate="03 Sep 2026, 12:00 PM"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("88")).toBeTruthy();
      expect(screen.getByText("Strong fundamentals and trade-off analysis.")).toBeTruthy();
    });

    const evaluateCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes("/api/interview/evaluate"),
    );
    expect(evaluateCalls).toHaveLength(0);
  });
});
