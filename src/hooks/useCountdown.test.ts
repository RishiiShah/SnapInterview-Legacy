// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

describe("useCountdown", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses one interval to tick to zero and resets to a supplied duration", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const { result } = renderHook(() => useCountdown(2));

    expect(setIntervalSpy).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.seconds).toBe(1);
    expect(setIntervalSpy).toHaveBeenCalledOnce();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.seconds).toBe(0);

    act(() => {
      result.current.reset(30);
    });
    expect(result.current.seconds).toBe(30);
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
  });

  it("resets to the initial duration with a stable callback", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(() => useCountdown(5));
    const initialReset = result.current.reset;

    act(() => {
      vi.advanceTimersByTime(2_000);
      result.current.reset();
    });
    expect(result.current.seconds).toBe(5);

    rerender();
    expect(result.current.reset).toBe(initialReset);
  });

  it("restarts a full one-second boundary when reset while positive", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCountdown(5));

    act(() => {
      vi.advanceTimersByTime(600);
      result.current.reset(30);
    });
    act(() => {
      vi.advanceTimersByTime(550);
    });
    expect(result.current.seconds).toBe(30);

    act(() => {
      vi.advanceTimersByTime(450);
    });
    expect(result.current.seconds).toBe(29);
  });

  it("does not create an interval at zero and cleans up an active interval on unmount", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const zeroCountdown = renderHook(() => useCountdown(0));

    expect(setIntervalSpy).not.toHaveBeenCalled();
    zeroCountdown.unmount();

    const activeCountdown = renderHook(() => useCountdown(5));
    expect(setIntervalSpy).toHaveBeenCalledOnce();
    activeCountdown.unmount();
    expect(clearIntervalSpy).toHaveBeenCalledOnce();
  });
});
