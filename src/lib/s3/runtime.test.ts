import { beforeEach, describe, expect, it, vi } from "vitest";

const s3ClientConstructorMock = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    constructor(args: unknown) {
      s3ClientConstructorMock(args);
    }
  },
}));

vi.mock("@/lib/env", () => ({
  requireAwsS3Env: vi.fn(() => ({
    region: "us-east-1",
    accessKeyId: "mock-access-key",
    secretAccessKey: "mock-secret-key",
    bucketName: "snap-interview-test",
  })),
}));

describe("S3 Runtime Singleton", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns the same singleton client across multiple getS3Runtime calls", async () => {
    const { getS3Runtime } = await import("./runtime");

    const runtime1 = getS3Runtime();
    const runtime2 = getS3Runtime();

    expect(runtime1.client).toBe(runtime2.client);
    expect(runtime1.bucketName).toBe("snap-interview-test");
    expect(runtime2.bucketName).toBe("snap-interview-test");
    expect(s3ClientConstructorMock).toHaveBeenCalledTimes(1);
    expect(s3ClientConstructorMock).toHaveBeenCalledWith({
      region: "us-east-1",
      credentials: {
        accessKeyId: "mock-access-key",
        secretAccessKey: "mock-secret-key",
      },
    });
  });

  it("throws when AWS configuration is missing", async () => {
    const { requireAwsS3Env } = await import("@/lib/env");
    vi.mocked(requireAwsS3Env).mockImplementation(() => {
      throw new Error("Missing AWS configuration");
    });

    const { getS3Runtime } = await import("./runtime");
    expect(() => getS3Runtime()).toThrow("Missing AWS configuration");
  });
});
