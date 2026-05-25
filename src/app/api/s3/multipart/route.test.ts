import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createPOST } from "./create/route";
import { POST as signPartPOST } from "./sign-part/route";
import { POST as completePOST } from "./complete/route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  requireAwsS3Env: vi.fn(() => ({
    region: "us-east-1",
    accessKeyId: "test",
    secretAccessKey: "secret",
    bucketName: "bucket",
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findFirst: vi.fn(),
    },
  },
}));

const { mockS3Send } = vi.hoisted(() => ({
  mockS3Send: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return { send: mockS3Send };
  }),
  CreateMultipartUploadCommand: vi.fn(),
  UploadPartCommand: vi.fn(),
  CompleteMultipartUploadCommand: vi.fn(),
  AbortMultipartUploadCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://presigned.url/part"),
}));

describe("S3 Multipart APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
    });
  });

  describe("POST /api/s3/multipart/create", () => {
    it("returns 403 when interview is not owned", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue(null as never);
      const req = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const res = await createPOST(req);
      expect(res.status).toBe(403);
    });

    it("creates a multipart upload and returns uploadId", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const req = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const res = await createPOST(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ uploadId: "upload-123", key: "user-1/interview-a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.webm" });
      expect(CreateMultipartUploadCommand).toHaveBeenCalled();
    });
  });

  describe("POST /api/s3/multipart/sign-part", () => {
    it("returns 403 when trying to sign part for another user's key", async () => {
      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: JSON.stringify({ key: "other-user/interview.webm", uploadId: "123", partNumber: 1 }),
      });
      const res = await signPartPOST(req);
      expect(res.status).toBe(403);
    });

    it("returns a presigned url for a valid part", async () => {
      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: JSON.stringify({ key: "user-1/interview.webm", uploadId: "123", partNumber: 1 }),
      });
      const res = await signPartPOST(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ url: "https://presigned.url/part" });
      expect(UploadPartCommand).toHaveBeenCalled();
    });
  });

  describe("POST /api/s3/multipart/complete", () => {
    it("aborts the upload when action is abort", async () => {
      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: JSON.stringify({ key: "user-1/interview.webm", uploadId: "123", parts: [{PartNumber: 1, ETag: "123"}], action: "abort" }),
      });
      mockS3Send.mockResolvedValueOnce({});
      const res = await completePOST(req);
      expect(res.status).toBe(200);
      expect(AbortMultipartUploadCommand).toHaveBeenCalled();
      expect(await res.json()).toEqual({ success: true, action: "aborted" });
    });

    it("completes the upload successfully", async () => {
      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: JSON.stringify({ key: "user-1/interview.webm", uploadId: "123", parts: [{PartNumber: 1, ETag: "abc"}], action: "complete" }),
      });
      mockS3Send.mockResolvedValueOnce({});
      const res = await completePOST(req);
      expect(res.status).toBe(200);
      expect(CompleteMultipartUploadCommand).toHaveBeenCalled();
      expect(await res.json()).toEqual({ success: true, key: "user-1/interview.webm" });
    });
  });
});
