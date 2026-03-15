import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { DELETE, GET } from "./route";

import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { listUserVideos } from "@/lib/s3/videos";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/s3/videos", () => ({
  listUserVideos: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  requireAwsS3Env: vi.fn(() => ({
    region: "us-east-1",
    accessKeyId: "test",
    secretAccessKey: "secret",
    bucketName: "bucket",
  })),
}));

vi.mock("@aws-sdk/client-s3", () => {
  const actual = vi.importActual<typeof import("@aws-sdk/client-s3")>(
    "@aws-sdk/client-s3",
  );
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(() => ({})),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => input),
  };
});

describe("GET /api/s3/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/s3/videos");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("lists videos for the authenticated user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({
      userId: "user-1",
    } as never);

    vi.mocked(listUserVideos).mockResolvedValue({
      videos: [
        {
          key: "user-1/interview-1.webm",
          url: "https://example.com/1",
          lastModified: new Date(),
          size: 123,
        }
      ]
    } as any);

    const req = new Request("http://localhost/api/s3/videos");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.videos).toHaveLength(1);
    expect(listUserVideos).toHaveBeenCalledWith("user-1/", {
      maxKeys: 12,
      continuationToken: undefined
    });
  });
});

describe("DELETE /api/s3/videos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new Request("http://localhost/api/s3/videos", {
      method: "DELETE",
      body: JSON.stringify({ key: "user-1/interview-1.webm" }),
    });

    const res = await DELETE(req);

    expect(res.status).toBe(403);
    expect(getSessionUserIdentity).not.toHaveBeenCalled();
  });

  it("returns 401 when user is not authenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/s3/videos", {
      method: "DELETE",
      body: JSON.stringify({ key: "user-1/interview-1.webm" }),
    });

    const res = await DELETE(req);

    expect(res.status).toBe(401);
  });

  it("prevents deleting keys outside the user's prefix", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({
      userId: "user-1",
    } as never);

    const req = new Request("http://localhost/api/s3/videos", {
      method: "DELETE",
      body: JSON.stringify({ key: "other-user/interview-1.webm" }),
    });

    const res = await DELETE(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized access to key");
  });
});

