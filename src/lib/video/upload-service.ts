import { withRetry } from "@/utils/retry";
import { logger } from "@/utils/logger";

export type InterviewCompletionStatus = "COMPLETED" | "ABORTED";

type FinalizeInterviewUploadOptions = {
  interviewId: string;
  status: InterviewCompletionStatus;
  stopVideoRecording: () => Promise<Blob | null>;
};

type PresignedPostPayload = {
  url: string;
  fields: Record<string, string>;
  key: string;
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

async function uploadBlobToPresignedPost(
  url: string,
  fields: Record<string, string>,
  blob: Blob
): Promise<boolean> {
  const formData = new FormData();
  for (const [fieldKey, value] of Object.entries(fields)) {
    formData.append(fieldKey, value);
  }
  formData.append("file", blob, "recording.webm");

  const uploadRes = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    logger.error("Failed to upload video blob to S3", { 
      status: uploadRes.status,
      url 
    });
    return false;
  }

  return true;
}

async function createPresignedUploadUrl(interviewId: string): Promise<PresignedPostPayload | undefined> {
  const res = await fetch("/api/s3/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId }),
  });

  if (!res.ok) {
    logger.error("Failed to get presigned URL", { 
      status: res.status, 
      interviewId 
    });
    return undefined;
  }

  const payload = await res.json();
  if (!payload?.url || !payload?.fields) return undefined;
  return payload as PresignedPostPayload;
}

export type FinalizeResult = 
  | { type: "ok"; videoKey?: string }
  | { type: "error"; message: string; stage: "recording" | "upload" | "metadata" };

export async function finalizeInterviewUpload({
  interviewId,
  status,
  stopVideoRecording,
}: FinalizeInterviewUploadOptions): Promise<FinalizeResult> {
  let blob: Blob | null = null;
  try {
    blob = await stopVideoRecording();
  } catch (error) {
    logger.error("Failed to stop video recording", { error, interviewId });
    return { type: "error", message: "Failed to stop video recording", stage: "recording" };
  }

  let videoKey: string | undefined;

  if (blob && blob.size > 0) {
    const presigned = await createPresignedUploadUrl(interviewId);
    if (!presigned) {
      return { type: "error", message: "Failed to prepare video upload", stage: "upload" };
    }

    const uploaded = await uploadBlobToPresignedPost(presigned.url, presigned.fields, blob);
    if (!uploaded) {
      return { type: "error", message: "Failed to upload video recording", stage: "upload" };
    }

    videoKey = presigned.key;
  }

  try {
    // Retry metadata update as it is critical for session consistency
    await withRetry(async () => {
      const res = await fetch("/api/interview/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewId, videoKey, status }),
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
