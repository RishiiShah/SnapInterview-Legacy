// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import RecordingsList from "./RecordingsList";

vi.mock("./RecordingModal", () => ({
  default: ({ isOpen, interviewId }: { isOpen: boolean; interviewId: string | null }) =>
    isOpen ? <div data-testid="recording-modal">{interviewId}</div> : null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function mockSignedUrlResponse() {
  return new Response(JSON.stringify({ url: "https://signed.example/video.webm" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
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
});
