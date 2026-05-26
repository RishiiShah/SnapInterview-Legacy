import { withRetry } from "@/utils/retry";
import { logger } from "@/utils/logger";

export type InterviewCompletionStatus = "COMPLETED" | "ABORTED";

type FinalizeInterviewUploadOptions = {
  interviewId: string;
  status: InterviewCompletionStatus;
  stopVideoRecording: () => Promise<{ videoKey: string; videoCompletionToken: string } | null>;
};

async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const payload = (await response.json()) as { error?: string } | null;
    return payload?.error;
  } catch {
    return undefined;
  }
}

async function cleanupUploadedVideo(videoKey: string): Promise<void> {
  const response = await fetch("/api/s3/videos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: videoKey }),
  });

  if (!response.ok) {
    throw new Error((await readErrorMessage(response)) || `Cleanup failed with status ${response.status}`);
  }
}

export type FinalizeResult = 
  | { type: "ok"; videoKey?: string }
  | { type: "error"; message: string; stage: "recording" | "upload" | "metadata" };

export async function finalizeInterviewUpload({
  interviewId,
  status,
  stopVideoRecording,
}: FinalizeInterviewUploadOptions): Promise<FinalizeResult> {
  let videoKey: string | undefined;
  let videoCompletionToken: string | undefined;

  try {
    const recordingResult = await stopVideoRecording();
    if (recordingResult?.videoKey) {
      videoKey = recordingResult.videoKey;
      videoCompletionToken = recordingResult.videoCompletionToken;
    }
  } catch (error) {
    logger.error("Failed to stop video recording or finalize multipart upload", { error, interviewId });
    return { type: "error", message: "Failed to finalize video upload", stage: "upload" };
  }

  if (videoKey && !videoCompletionToken) {
    logger.error("Failed to finalize video upload: missing completion token", { interviewId });
    return { type: "error", message: "Failed to finalize video upload", stage: "upload" };
  }

  try {
    // Retry metadata update as it is critical for session consistency
    await withRetry(async () => {
      const res = await fetch("/api/interview/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, videoKey, videoCompletionToken, status }),
      });

      if (!res.ok) {
        throw Object.assign(
          new Error((await readErrorMessage(res)) || `Metadata update failed with status ${res.status}`),
          { status: res.status },
        );
      }

       const payload = await res.json();
       
       // Verify that the backend actually persisted what we sent
       const isStatusMatch = payload.status === status;
       const isVideoMatch = !videoKey || payload.videoKey === videoKey;

       if (!isStatusMatch || !isVideoMatch) {
         throw new Error("Metadata mismatch: backend state does not match expected final state");
      }
    }, { maxRetries: 3 });

    return { type: "ok", videoKey };
  } catch (error) {
    if (videoKey) {
      try {
        await cleanupUploadedVideo(videoKey);
        logger.warn("Cleaned up uploaded video after metadata failure", { interviewId, videoKey, status });
      } catch (cleanupError) {
        logger.error("Failed to clean up uploaded video after metadata failure", {
          interviewId,
          videoKey,
          status,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      }
    }

    logger.error("Failed to update interview session metadata after retries", { 
      error: error instanceof Error ? error.message : String(error), 
      interviewId,
      status 
    });
    return { type: "error", message: "Interview saved, but failed to update status. Please contact support.", stage: "metadata" };
  }
}
