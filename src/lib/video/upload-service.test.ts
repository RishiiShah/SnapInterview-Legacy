import { describe, it, expect, vi, beforeEach } from "vitest";
import { finalizeInterviewUpload } from "./upload-service";
import { logger } from "@/utils/logger";

vi.mock("@/utils/retry", () => ({
  withRetry: vi.fn(async (fn) => fn()),
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("finalizeInterviewUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("handles recording failure gracefully", async () => {
    const stopVideoRecording = vi.fn().mockRejectedValue(new Error("recording failed"));
    
    const result = await finalizeInterviewUpload({
      interviewId: "int-1",
      status: "COMPLETED",
      stopVideoRecording,
    });

    expect(result).toEqual({ type: "error", message: "Failed to finalize video upload", stage: "upload" });
    expect(logger.error).toHaveBeenCalled();
  });

  it("successfully finalizes upload when no video was recorded", async () => {
    const stopVideoRecording = vi.fn().mockResolvedValue(null);
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "COMPLETED" }),
    } as Response);

    const result = await finalizeInterviewUpload({
      interviewId: "int-1",
      status: "COMPLETED",
      stopVideoRecording,
    });

    expect(result).toEqual({ type: "ok", videoKey: undefined });
  });

  it("successfully finalizes upload with a video", async () => {
    const stopVideoRecording = vi.fn().mockResolvedValue({ videoKey: "test-key" });
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "COMPLETED", videoKey: "test-key" }),
    } as Response);

    const result = await finalizeInterviewUpload({
      interviewId: "int-1",
      status: "COMPLETED",
      stopVideoRecording,
    });

    expect(result).toEqual({ type: "ok", videoKey: "test-key" });
    expect(global.fetch).toHaveBeenCalledWith("/api/interview/session", expect.any(Object));
  });

  it("cleans up the uploaded recording when metadata persistence fails", async () => {
    const stopVideoRecording = vi.fn().mockResolvedValue({ videoKey: "test-key" });
    
    // Metadata update fails
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "metadata write failed" }),
    } as Response);

    // Cleanup succeeds
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await finalizeInterviewUpload({
      interviewId: "int-1",
      status: "COMPLETED",
      stopVideoRecording,
    });

    expect(result).toEqual({ type: "error", message: "Interview saved, but failed to update status. Please contact support.", stage: "metadata" });
    expect(global.fetch).toHaveBeenCalledTimes(2); // metadata patch + cleanup delete
  });
});
