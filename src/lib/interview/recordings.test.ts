import { describe, expect, it } from "vitest";

import { extractInterviewIdFromVideoKey, filterSessionsWithListedRecordingObjects } from "./recordings";

describe("interview recording helpers", () => {
  it("keeps legacy recording-backed sessions by matching stored videoKey instead of parsing UUIDs", () => {
    const legacySession = {
      id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      videoKey: "user-1/interview-session-1.webm",
    };
    const missingSession = {
      id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      videoKey: "user-1/interview-missing.webm",
    };

    expect(filterSessionsWithListedRecordingObjects([legacySession, missingSession], [
      { key: "user-1/interview-session-1.webm" },
    ])).toEqual([legacySession]);
  });

  it("still extracts UUID interview IDs from current recording keys", () => {
    expect(extractInterviewIdFromVideoKey("user-1/interview-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.webm"))
      .toBe("aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
  });
});
