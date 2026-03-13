import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";

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

const mockCreatePresignedPost = vi.fn();
vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: (...args: unknown[]) => mockCreatePresignedPost(...args),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
}));

describe("POST /api/s3/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new Request("http://localhost/api/s3/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(getSessionUserIdentity).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/s3/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when interviewId is missing", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
    });

    const req = new Request("http://localhost/api/s3/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when interview session is not owned by user", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
    });
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/s3/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ interviewId: "b0f0bc00-0c0b-4ef8-bb6d-6bb9bd380a22" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns presigned URL on success", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
    });
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue({
      id: "int-1",
      userId: "user-1",
    } as never);
    mockCreatePresignedPost.mockResolvedValue({
      url: "https://bucket.s3.amazonaws.com",
      fields: { key: "user-1/interview-int-1.webm" },
    });

    const req = new Request("http://localhost/api/s3/upload", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({ interviewId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      url: "https://bucket.s3.amazonaws.com",
      key: "user-1/interview-a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11.webm",
    });
  });
});
