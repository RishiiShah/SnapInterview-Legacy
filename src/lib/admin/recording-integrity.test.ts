import { describe, expect, it } from "vitest";

import {
  classifyRecordingIntegrity,
  recordingIntegrityHasIssue,
} from "./recording-integrity";

describe("recording integrity", () => {
  it("classifies empty recording state", () => {
    expect(
      classifyRecordingIntegrity({ videoKey: null, videoUrl: null, s3Exists: null }),
    ).toBe("no_recording");
  });

  it("flags url without key", () => {
    expect(
      classifyRecordingIntegrity({
        videoKey: null,
        videoUrl: "https://example.com/a.webm",
        s3Exists: null,
      }),
    ).toBe("url_without_key");
  });

  it("flags missing s3 object", () => {
    expect(
      classifyRecordingIntegrity({
        videoKey: "user/interview.webm",
        videoUrl: null,
        s3Exists: false,
      }),
    ).toBe("missing_object");
  });

  it("marks ready when s3 object exists", () => {
    expect(
      classifyRecordingIntegrity({
        videoKey: "user/interview.webm",
        videoUrl: "https://example.com/a.webm",
        s3Exists: true,
      }),
    ).toBe("ready");
  });

  it("detects integrity issues", () => {
    expect(recordingIntegrityHasIssue("missing_object")).toBe(true);
    expect(recordingIntegrityHasIssue("ready")).toBe(false);
  });
});
