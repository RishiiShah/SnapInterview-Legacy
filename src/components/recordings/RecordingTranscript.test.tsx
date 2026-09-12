// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordingTranscript } from "./RecordingTranscript";

describe("RecordingTranscript replay", () => {
  it("highlights playback and seeks from an answer timestamp", () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const onSeek = vi.fn();
    render(
      <RecordingTranscript
        interviewId="interview-1"
        feedback={[]}
        transcript={[{ id: "turn-1", order: 0, question: "Design an API", answer: "I would start with resources." }]}
        replayTurns={[{
          transcriptOrder: 0,
          questionStartMs: 1_000,
          questionEndMs: 3_000,
          answerStartMs: 4_000,
          answerEndMs: 9_000,
          timingSource: "browser-v1",
          confidenceScore: 0.9,
        }]}
        currentTimeMs={5_000}
        onSeek={onSeek}
      />,
    );

    expect(screen.getByText("Playing")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /play answer 1 from 0:04/i }));
    expect(onSeek).toHaveBeenCalledWith(3_250);
  });
});
