import {
  finalizeInterviewUpload,
  type FinalizeResult,
  type InterviewCompletionStatus,
} from "@/lib/video/upload-service";

type StopVideoRecording = () => Promise<{ videoKey: string; videoCompletionToken: string } | null>;

const inFlightByInterviewId = new Map<string, Promise<FinalizeResult>>();

/**
 * Runs video stop + S3 multipart complete + session PATCH outside the interview
 * page lifecycle so navigation does not cancel the upload.
 */
export function scheduleInterviewFinalize(params: {
  interviewId: string;
  status: InterviewCompletionStatus;
  stopVideoRecording: StopVideoRecording;
}): Promise<FinalizeResult> {
  const existing = inFlightByInterviewId.get(params.interviewId);
  if (existing) {
    return existing;
  }

  const promise = finalizeInterviewUpload(params).finally(() => {
    inFlightByInterviewId.delete(params.interviewId);
  });

  inFlightByInterviewId.set(params.interviewId, promise);
  return promise;
}
