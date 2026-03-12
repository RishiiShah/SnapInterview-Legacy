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

async function uploadBlobToPresignedPost(
  url: string,
  fields: Record<string, string>,
  blob: Blob
): Promise<string | undefined> {
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
    console.error("Failed to upload video blob to S3", await uploadRes.text());
    return undefined;
  }

  // S3 presigned POST returns the object URL as Location header or we construct it
  return `${url}${fields["key"] ?? ""}`;
}

async function createPresignedUploadUrl(interviewId: string): Promise<PresignedPostPayload | undefined> {
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
  if (!payload?.url || !payload?.fields) return undefined;
  return payload as PresignedPostPayload;
}

export async function finalizeInterviewUpload({
  interviewId,
  status,
  stopVideoRecording,
}: FinalizeInterviewUploadOptions) {
  const blob = await stopVideoRecording();
  let videoUrl: string | undefined;

  if (blob && blob.size > 0) {
    const presigned = await createPresignedUploadUrl(interviewId);
    if (presigned) {
      videoUrl = await uploadBlobToPresignedPost(presigned.url, presigned.fields, blob);
    }
  }

  await fetch("/api/interview/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ interviewId, videoUrl, status }),
  });
}
