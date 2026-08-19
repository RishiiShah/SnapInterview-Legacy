import { describe, expect, it, vi } from "vitest";
import {
  expectedInterviewVideoKey,
  isAuthorizedMultipartIdentity,
  multipartIdentitySchema,
} from "./multipart-request";
import { createMultipartUploadToken } from "./multipart-upload-token";

describe("Multipart Request Identity & Authorization", () => {
  const userId = "user-123";
  const interviewId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const key = expectedInterviewVideoKey(userId, interviewId);
  const uploadId = "upload-abc-789";

  it("derives canonical interview video keys", () => {
    expect(expectedInterviewVideoKey("u1", "int-1")).toBe("u1/interview-int-1.webm");
  });

  it("validates multipart identity schema with valid UUIDs", () => {
    const valid = multipartIdentitySchema.safeParse({
      interviewId,
      key,
      uploadId,
      uploadToken: "some-token",
    });
    expect(valid.success).toBe(true);
  });

  it("rejects multipart identity schema with invalid UUID", () => {
    const invalid = multipartIdentitySchema.safeParse({
      interviewId: "not-a-uuid",
      key,
      uploadId,
      uploadToken: "some-token",
    });
    expect(invalid.success).toBe(false);
  });

  it("authorizes a valid multipart upload token with matching parameters", () => {
    const uploadToken = createMultipartUploadToken({
      userId,
      interviewId,
      key,
      uploadId,
    });

    const isAuthorized = isAuthorizedMultipartIdentity({
      userId,
      interviewId,
      key,
      uploadId,
      uploadToken,
    });

    expect(isAuthorized).toBe(true);
  });

  it("rejects when key does not match canonical format", () => {
    const wrongKey = "other-user/interview-a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.webm";
    const uploadToken = createMultipartUploadToken({
      userId,
      interviewId,
      key: wrongKey,
      uploadId,
    });

    const isAuthorized = isAuthorizedMultipartIdentity({
      userId,
      interviewId,
      key: wrongKey,
      uploadId,
      uploadToken,
    });

    expect(isAuthorized).toBe(false);
  });

  it("rejects when interviewId is mismatched", () => {
    const otherInterviewId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
    const uploadToken = createMultipartUploadToken({
      userId,
      interviewId,
      key,
      uploadId,
    });

    const isAuthorized = isAuthorizedMultipartIdentity({
      userId,
      interviewId: otherInterviewId,
      key,
      uploadId,
      uploadToken,
    });

    expect(isAuthorized).toBe(false);
  });

  it("rejects when uploadId is mismatched", () => {
    const uploadToken = createMultipartUploadToken({
      userId,
      interviewId,
      key,
      uploadId,
    });

    const isAuthorized = isAuthorizedMultipartIdentity({
      userId,
      interviewId,
      key,
      uploadId: "different-upload-id",
      uploadToken,
    });

    expect(isAuthorized).toBe(false);
  });

  it("rejects when token is invalid or tampered", () => {
    const isAuthorized = isAuthorizedMultipartIdentity({
      userId,
      interviewId,
      key,
      uploadId,
      uploadToken: "tampered.token.value",
    });

    expect(isAuthorized).toBe(false);
  });
});
