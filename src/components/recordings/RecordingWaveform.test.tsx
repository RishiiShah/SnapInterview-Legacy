// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecordingWaveform } from "./RecordingWaveform";

describe("RecordingWaveform", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Audio decoding unavailable in test")));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("seeks the shared recording clock when the waveform is clicked", () => {
    const onSeek = vi.fn();
    render(
      <RecordingWaveform
        sourceUrl="https://recordings.example/interview.webm"
        durationMs={10_000}
        currentTimeMs={0}
        replayTurns={[]}
        onSeek={onSeek}
      />,
    );

    const waveform = screen.getByRole("slider", { name: "Seek through interview recording" });
    vi.spyOn(waveform, "getBoundingClientRect").mockReturnValue({
      left: 100,
      right: 500,
      width: 400,
      top: 0,
      bottom: 64,
      height: 64,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(waveform, { clientX: 300 });
    expect(onSeek).toHaveBeenCalledWith(5_000);
  });

  it("supports five-second keyboard seeking", () => {
    const onSeek = vi.fn();
    render(
      <RecordingWaveform
        sourceUrl="https://recordings.example/interview.webm"
        durationMs={20_000}
        currentTimeMs={10_000}
        replayTurns={[]}
        onSeek={onSeek}
      />,
    );

    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(onSeek).toHaveBeenCalledWith(15_000);
  });
});
