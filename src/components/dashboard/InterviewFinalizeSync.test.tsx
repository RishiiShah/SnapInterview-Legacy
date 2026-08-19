// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deferred } from "@/test-utils/deferred";

const mocks = vi.hoisted(() => ({
  clearPendingInterviewFinalize: vi.fn(),
  getPendingInterviewFinalizeIds: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/lib/interview/finalize-pending-client", () => ({
  clearPendingInterviewFinalize: mocks.clearPendingInterviewFinalize,
  getPendingInterviewFinalizeIds: mocks.getPendingInterviewFinalizeIds,
}));

import InterviewFinalizeSync from "./InterviewFinalizeSync";

describe("InterviewFinalizeSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("checks every pending finalization concurrently", () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    mocks.getPendingInterviewFinalizeIds.mockReturnValue(["first", "second"]);
    vi.mocked(fetch).mockImplementation((url: string | URL | Request) =>
      String(url).includes("first") ? first.promise : second.promise,
    );

    render(<InterviewFinalizeSync />);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith("/api/interview/session?interviewId=first");
    expect(fetch).toHaveBeenCalledWith("/api/interview/session?interviewId=second");
  });

  it("does not start a second poll while the current one is still pending", () => {
    vi.useFakeTimers();
    const pending = deferred<Response>();
    mocks.getPendingInterviewFinalizeIds.mockReturnValue(["first"]);
    vi.mocked(fetch).mockReturnValue(pending.promise);

    render(<InterviewFinalizeSync />);

    expect(fetch).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2_000));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
