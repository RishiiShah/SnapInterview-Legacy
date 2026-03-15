import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  requireAwsS3Env: vi.fn(() => ({
    region: "us-east-1",
    accessKeyId: "test",
    secretAccessKey: "secret",
    bucketName: "bucket",
  })),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  ListObjectsV2Command: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

import { normalizeListedVideoObjects } from "./videos";

describe("normalizeListedVideoObjects", () => {
  it("filters out empty and non-recording S3 objects and sorts newest first", () => {
    const videos = normalizeListedVideoObjects([
      {
        Key: "user-1/",
        LastModified: new Date("2026-03-15T12:00:00.000Z"),
        Size: 0,
      },
      {
        Key: "user-1/interview-b.webm",
        LastModified: new Date("2026-03-15T10:00:00.000Z"),
        Size: 2048,
      },
      {
        Key: "user-1/interview-a.webm",
        LastModified: new Date("2026-03-15T11:00:00.000Z"),
        Size: 1024,
      },
      {
        Key: "user-1/debug.txt",
        LastModified: new Date("2026-03-15T13:00:00.000Z"),
        Size: 512,
      },
      {
        Key: "user-1/interview-empty.webm",
        LastModified: new Date("2026-03-15T14:00:00.000Z"),
        Size: 0,
      },
    ]);

    expect(videos).toEqual([
      {
        key: "user-1/interview-a.webm",
        lastModified: "2026-03-15T11:00:00.000Z",
        size: 1024,
      },
      {
        key: "user-1/interview-b.webm",
        lastModified: "2026-03-15T10:00:00.000Z",
        size: 2048,
      },
    ]);
  });
});
