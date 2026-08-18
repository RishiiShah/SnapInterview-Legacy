import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createPOST } from "./create/route";
import { POST as signPartPOST } from "./sign-part/route";
import { POST as completePOST } from "./complete/route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { MULTIPART_UPLOAD_MAX_BYTES } from "@/lib/s3/multipart-upload-constraints";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    AUTH_SECRET: "test-auth-secret-32-chars-minimum",
  },
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

const { mockRateLimitState } = vi.hoisted(() => ({
  mockRateLimitState: {
    limitedNamespaces: new Set<string>(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn((namespace: string) => ({
    isLimited: vi.fn(() => mockRateLimitState.limitedNamespaces.has(namespace)),
  })),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(function () {
    return { send: mockS3Send };
  }),
  CreateMultipartUploadCommand: vi.fn(),
  UploadPartCommand: vi.fn(),
  CompleteMultipartUploadCommand: vi.fn(),
  AbortMultipartUploadCommand: vi.fn(),
  ListPartsCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://presigned.url/part"),
}));

describe("S3 Multipart APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimitState.limitedNamespaces.clear();
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
      expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith({
        where: {
          id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          userId: "user-1",
          deletedAt: null,
        },
        select: { id: true, videoKey: true },
      });
      expect(CreateMultipartUploadCommand).toHaveBeenCalled();
    });

    it("returns 400 when request body is malformed JSON", async () => {
      const req = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: "not-json",
      });
      const res = await createPOST(req);
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body" });
    });
  });

  describe("POST /api/s3/multipart/sign-part", () => {
    it("returns 403 when trying to sign part for another user's key", async () => {
      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key: "other-user/interview-a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.webm",
          uploadId: "123",
          uploadToken: "invalid-token",
          partNumber: 1,
        }),
      });
      const res = await signPartPOST(req);
      expect(res.status).toBe(403);
    });

    it("rejects a user-prefixed key that does not match the upload token", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key: "user-1/interview-b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22.webm",
          uploadId: "upload-123",
          uploadToken,
          partNumber: 1,
        }),
      });

      const res = await signPartPOST(req);
      expect(res.status).toBe(403);
      expect(UploadPartCommand).not.toHaveBeenCalled();
    });

    it("returns a presigned url for a valid part", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          partNumber: 1,
        }),
      });
      const res = await signPartPOST(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ url: "https://presigned.url/part" });
      expect(UploadPartCommand).toHaveBeenCalled();
    });

    it("rejects part numbers above the bounded upload size", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          partNumber: 101,
        }),
      });

      const res = await signPartPOST(req);
      expect(res.status).toBe(400);
      expect(UploadPartCommand).not.toHaveBeenCalled();
    });

    it("rate limits repeated part signing for one upload", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();
      mockRateLimitState.limitedNamespaces.add("s3-multipart-sign-part");

      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          partNumber: 1,
        }),
      });

      const res = await signPartPOST(req);
      expect(res.status).toBe(429);
      expect(UploadPartCommand).not.toHaveBeenCalled();
    });

    it("returns 400 when request body is malformed JSON", async () => {
      const req = new Request("http://localhost/api/s3/multipart/sign-part", {
        method: "POST",
        body: "not-json",
      });
      const res = await signPartPOST(req);
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body" });
    });
  });

  describe("POST /api/s3/multipart/complete", () => {
    it("aborts the upload when action is abort", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          action: "abort",
        }),
      });
      mockS3Send.mockResolvedValueOnce({});
      const res = await completePOST(req);
      expect(res.status).toBe(200);
      expect(AbortMultipartUploadCommand).toHaveBeenCalled();
      expect(await res.json()).toEqual({ success: true, action: "aborted" });
    });

    it("completes the upload successfully", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          parts: [{PartNumber: 1, ETag: "abc"}],
          action: "complete",
        }),
      });
      mockS3Send
        .mockResolvedValueOnce({ Parts: [{ PartNumber: 1, ETag: "\"abc\"", Size: 1024 }] })
        .mockResolvedValueOnce({});
      const res = await completePOST(req);
      expect(res.status).toBe(200);
      expect(ListPartsCommand).toHaveBeenCalled();
      expect(CompleteMultipartUploadCommand).toHaveBeenCalled();
      expect(await res.json()).toMatchObject({
        success: true,
        key,
        videoCompletionToken: expect.any(String),
      });
    });

    it("rejects completion with too many parts", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          parts: Array.from({ length: 101 }, (_, index) => ({
            PartNumber: index + 1,
            ETag: `etag-${index + 1}`,
          })),
          action: "complete",
        }),
      });

      const res = await completePOST(req);
      expect(res.status).toBe(400);
      expect(CompleteMultipartUploadCommand).not.toHaveBeenCalled();
    });

    it("rejects and aborts completion when S3 reports uploaded parts exceed the maximum size", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          parts: [{ PartNumber: 1, ETag: "huge-part" }],
          action: "complete",
        }),
      });
      mockS3Send
        .mockResolvedValueOnce({
          Parts: [{ PartNumber: 1, ETag: "\"huge-part\"", Size: MULTIPART_UPLOAD_MAX_BYTES + 1 }],
        })
        .mockResolvedValueOnce({});

      const res = await completePOST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe("Upload exceeds the maximum allowed size");
      expect(ListPartsCommand).toHaveBeenCalled();
      expect(AbortMultipartUploadCommand).toHaveBeenCalled();
      expect(CompleteMultipartUploadCommand).not.toHaveBeenCalled();
    });

    it("rejects completion with non-sequential parts", async () => {
      vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({ id: "int-1", userId: "user-1" } as never);
      mockS3Send.mockResolvedValueOnce({ UploadId: "upload-123" });

      const createReq = new Request("http://localhost/api/s3/multipart/create", {
        method: "POST",
        body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
      });
      const createRes = await createPOST(createReq);
      const { key, uploadId, uploadToken } = await createRes.json();

      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: JSON.stringify({
          interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          key,
          uploadId,
          uploadToken,
          parts: [
            { PartNumber: 1, ETag: "etag-1" },
            { PartNumber: 3, ETag: "etag-3" },
          ],
          action: "complete",
        }),
      });

      const res = await completePOST(req);
      expect(res.status).toBe(400);
      expect(CompleteMultipartUploadCommand).not.toHaveBeenCalled();
    });

    it("returns 400 when request body is malformed JSON", async () => {
      const req = new Request("http://localhost/api/s3/multipart/complete", {
        method: "POST",
        body: "not-json",
      });
      const res = await completePOST(req);
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body" });
    });
  });
});
