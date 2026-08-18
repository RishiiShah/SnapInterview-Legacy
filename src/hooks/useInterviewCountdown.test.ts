// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useInterviewCountdown } from "./useInterviewCountdown";

describe("useInterviewCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not create countdown state or a timer before the interview starts", () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

    const { result } = renderHook(() =>
      useInterviewCountdown({
        interviewStarted: false,
        interviewDone: false,
        durationMinutes: 30,
        sessionCreatedAt: null,
        onExpired,
      }),
    );

    expect(result.current).toEqual({
      timeRemainingMs: null,
      timeRemainingFormatted: null,
      timeProgressPercent: null,
      isGraceWarningActive: false,
    });
    expect(setIntervalSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("uses the persisted start time and tracks progress at the warning boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));

    const { result } = renderHook(() =>
      useInterviewCountdown({
        interviewStarted: true,
        interviewDone: false,
        durationMinutes: 2,
        sessionCreatedAt: "2026-08-17T12:00:00.000Z",
        onExpired: vi.fn(),
      }),
    );

    expect(result.current.timeRemainingMs).toBe(120_000);
    expect(result.current.timeRemainingFormatted).toBe("2:00");
    expect(result.current.isGraceWarningActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.timeRemainingMs).toBe(60_000);
    expect(result.current.isGraceWarningActive).toBe(true);
  });

  it("fires expiration once at the exact end of the one-minute grace period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));
    const onExpired = vi.fn();

    renderHook(() =>
      useInterviewCountdown({
        interviewStarted: true,
        interviewDone: false,
        durationMinutes: 1,
        sessionCreatedAt: "2026-08-17T12:00:00.000Z",
        onExpired,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(119_000);
    });
    expect(onExpired).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(onExpired).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it("clears its interval when the interview finishes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));
    const onExpired = vi.fn();
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const { rerender } = renderHook(
      ({ interviewDone }) =>
        useInterviewCountdown({
          interviewStarted: true,
          interviewDone,
          durationMinutes: 1,
          sessionCreatedAt: "2026-08-17T12:00:00.000Z",
          onExpired,
        }),
      { initialProps: { interviewDone: false } },
    );

    rerender({ interviewDone: true });
    expect(clearIntervalSpy).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(onExpired).not.toHaveBeenCalled();
  });

  it("clears every scheduled timer on unmount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));

    const { unmount } = renderHook(() =>
      useInterviewCountdown({
        interviewStarted: true,
        interviewDone: false,
        durationMinutes: 1,
        sessionCreatedAt: "2026-08-17T12:00:00.000Z",
        onExpired: vi.fn(),
      }),
    );

    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
