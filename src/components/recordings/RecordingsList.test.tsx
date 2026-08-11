// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RecordingsList from "./RecordingsList";

vi.mock("./RecordingModal", () => ({
  default: ({ isOpen, interviewId }: { isOpen: boolean; interviewId: string | null }) =>
    isOpen ? <div data-testid="recording-modal">{interviewId}</div> : null,
}));

function mockSignedUrlResponse() {
  return new Response(JSON.stringify({ url: "https://signed.example/video.webm" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonResponse(body: Record<string, unknown>) {
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

describe("RecordingsList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockSignedUrlResponse()));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the read-only recording modal for an initial deep-linked interview", async () => {
    const interviewId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

    render(
      <RecordingsList
        initialSessions={[{
          id: interviewId,
          role: "Frontend Developer",
          company: "OpenAI",
          type: "technical",
          videoKey: "user-1/interview-legacy.webm",
          score: 88,
          createdAt: "2026-01-01T00:00:00.000Z",
        }]}
        initialHasMore={false}
        initialOpenInterviewId={interviewId}
      />,
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/s3/videos", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "user-1/interview-legacy.webm" }),
      }));
    });
    expect(screen.getByTestId("recording-modal").textContent).toBe(interviewId);
  });

  it("ignores a stale load-more response after the interview type changes", async () => {
    const stalePage = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn((url: string | URL | Request) => {
      const value = String(url);
      if (value.includes("cursorId=22222222-2222-4222-8222-222222222222")) return stalePage.promise;
      if (value.includes("type=behavioral-leadership")) {
        return Promise.resolve(jsonResponse({
          sessions: [{
            id: "behavioral-1",
            role: "Behavioral Result",
            company: null,
            type: "behavioral-leadership",
            videoKey: null,
            score: 92,
            createdAt: "2026-01-03T00:00:00.000Z",
          }],
          hasMore: false,
        }));
      }
      throw new Error(`Unexpected request: ${value}`);
    }));

    render(
      <RecordingsList
        initialSessions={[{
          id: "11111111-1111-4111-8111-111111111111",
          role: "Initial Result",
          company: null,
          type: "coding-algorithms",
          videoKey: null,
          score: 80,
          createdAt: "2026-01-02T00:00:00.000Z",
        }]}
        initialHasMore={true}
        initialNextCursor={{
          createdAt: "2026-01-02T00:00:00.000Z",
          id: "22222222-2222-4222-8222-222222222222",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more sessions →" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(
      "/api/interview/sessions?limit=12&cursorCreatedAt=2026-01-02T00%3A00%3A00.000Z&cursorId=22222222-2222-4222-8222-222222222222",
    ));

    fireEvent.click(screen.getByRole("button", { name: "Behavioral" }));
    await screen.findByText("Behavioral Result");

    await act(async () => {
      stalePage.resolve(jsonResponse({
        sessions: [{
          id: "stale-1",
          role: "Stale Result",
          company: null,
          type: "coding-algorithms",
          videoKey: null,
          score: 10,
          createdAt: "2026-01-01T00:00:00.000Z",
        }],
        hasMore: false,
      }));
      await Promise.resolve();
    });

    expect(screen.queryByText("Stale Result")).toBeNull();
    expect(screen.getByText("Behavioral Result")).toBeTruthy();
  });
});
