export type InterviewCompletionStatus = "COMPLETED" | "ABORTED";

type FinalizeInterviewUploadOptions = {
  interviewId: string;
  status: InterviewCompletionStatus;
  stopVideoRecording: () => Promise<Blob | null>;
};

async function uploadBlobToPresignedUrl(url: string, blob: Blob): Promise<string | undefined> {
  const uploadRes = await fetch(url, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": "video/webm",
    },
  });

  if (!uploadRes.ok) {
    console.error("Failed to upload video blob to S3", await uploadRes.text());
    return undefined;
  }

  return url.split("?")[0];
}

async function createPresignedUploadUrl(interviewId: string): Promise<string | undefined> {
  const res = await fetch("/api/s3/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId }),
  });

  if (!res.ok) {
    console.error("Failed to get presigned URL", await res.text());
    return undefined;
  }

  const payload = await res.json();
  return payload?.url;
}

export async function finalizeInterviewUpload({
  interviewId,
  status,
  stopVideoRecording,
}: FinalizeInterviewUploadOptions) {
  const blob = await stopVideoRecording();
  let videoUrl: string | undefined;

  if (blob && blob.size > 0) {
    const presignedUrl = await createPresignedUploadUrl(interviewId);
    if (presignedUrl) {
      videoUrl = await uploadBlobToPresignedUrl(presignedUrl, blob);
    }
  }

  await fetch("/api/interview/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId, videoUrl, status }),
  });
}
