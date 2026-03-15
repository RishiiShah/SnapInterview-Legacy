import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/retry", () => ({
  withRetry: async <T>(operation: () => Promise<T>) => operation(),
}));

import { finalizeInterviewUpload } from "./upload-service";

describe("finalizeInterviewUpload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("cleans up the uploaded recording when metadata persistence fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: "https://bucket.s3.amazonaws.com",
          fields: { key: "user-1/interview-int-1.webm", "Content-Type": "video/webm" },
          key: "user-1/interview-int-1.webm",
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "metadata write failed" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await finalizeInterviewUpload({
      interviewId: "int-1",
      status: "COMPLETED",
      stopVideoRecording: async () => new Blob(["video"], { type: "video/webm" }),
    });

    expect(result).toEqual({
      type: "error",
      message: "Interview saved, but failed to update status. Please contact support.",
      stage: "metadata",
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/s3/videos",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});
