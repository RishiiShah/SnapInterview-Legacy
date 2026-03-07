import { describe, expect, it } from "vitest";
import { shouldProcessFinalTranscriptBlock } from "./useChatSession";

describe("shouldProcessFinalTranscriptBlock", () => {
  it("returns false when the transcript block is empty", () => {
    expect(
      shouldProcessFinalTranscriptBlock({
        finalTranscriptBlock: "",
        interviewDone: false,
        processedTranscriptBlock: "previous",
      })
    ).toBe(false);
  });

  it("returns false when the interview is already done", () => {
    expect(
      shouldProcessFinalTranscriptBlock({
        finalTranscriptBlock: "final answer",
        interviewDone: true,
        processedTranscriptBlock: "",
      })
    ).toBe(false);
  });

  it("returns false when the transcript block is already processed", () => {
    expect(
      shouldProcessFinalTranscriptBlock({
        finalTranscriptBlock: "same text",
        interviewDone: false,
        processedTranscriptBlock: "same text",
      })
    ).toBe(false);
  });

  it("returns true for a new transcript block while interview is active", () => {
    expect(
      shouldProcessFinalTranscriptBlock({
        finalTranscriptBlock: "new answer",
        interviewDone: false,
        processedTranscriptBlock: "old answer",
      })
    ).toBe(true);
  });
});
