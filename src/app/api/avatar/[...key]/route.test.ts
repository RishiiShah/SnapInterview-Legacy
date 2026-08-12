import { describe, expect, it, vi } from "vitest";

const { s3SendMock } = vi.hoisted(() => ({
  s3SendMock: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/env", () => ({
  requireAwsS3Env: vi.fn(() => ({
    region: "us-east-1",
    accessKeyId: "test",
    secretAccessKey: "test",
    bucketName: "test-bucket",
  })),
}));

vi.mock("@/utils/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: vi.fn().mockImplementation(function (input) { return input; }),
  S3Client: vi.fn().mockImplementation(function () { return { send: s3SendMock }; }),
}));

import { GET } from "./route";

describe("GET /api/avatar/[...key]", () => {
  it("rejects a non-avatar object key without reading S3", async () => {
    const response = await GET(new Request("http://localhost/api/avatar/user-1/recording.webm"), {
      params: Promise.resolve({ key: ["user-1", "recording.webm"] }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid avatar key" });
    expect(s3SendMock).not.toHaveBeenCalled();
  });
});
