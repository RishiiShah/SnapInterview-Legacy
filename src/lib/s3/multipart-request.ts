import { z } from "zod/v4";
import { interviewIdSchema } from "@/lib/interview/domain";
import { verifyMultipartUploadToken } from "@/lib/s3/multipart-upload-token";

export const multipartIdentitySchema = z.object({
  interviewId: interviewIdSchema,
  key: z.string().min(1),
  uploadId: z.string().min(1),
  uploadToken: z.string().min(1),
});

export function expectedInterviewVideoKey(userId: string, interviewId: string): string {
  return `${userId}/interview-${interviewId}.webm`;
}

export function isAuthorizedMultipartIdentity(params: {
  userId: string;
  interviewId: string;
  key: string;
  uploadId: string;
  uploadToken: string;
}): boolean {
  const expectedKey = expectedInterviewVideoKey(params.userId, params.interviewId);
  if (params.key !== expectedKey) {
    return false;
  }
  return verifyMultipartUploadToken(params.uploadToken, {
    userId: params.userId,
    interviewId: params.interviewId,
    key: params.key,
    uploadId: params.uploadId,
  });
}
