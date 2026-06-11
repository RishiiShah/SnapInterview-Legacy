import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  isAwsS3Configured: vi.fn(),
  s3ObjectExists: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("@/lib/env", () => ({
  isAwsS3Configured: mocks.isAwsS3Configured,
}));

vi.mock("@/lib/s3/videos", () => ({
  s3ObjectExists: mocks.s3ObjectExists,
}));

import { repairLegacyRecordingMetadata } from "./recording-repair";

describe("repairLegacyRecordingMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAwsS3Configured.mockReturnValue(false);
    mocks.s3ObjectExists.mockResolvedValue(true);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("repairs virtual-hosted S3 URLs by storing the derived user-prefixed videoKey", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      userId: "user-1",
      videoUrl: "https://snap-recordings.s3.us-east-1.amazonaws.com/user-1/interview-session-1.webm",
      videoKey: null,
    });

    await expect(repairLegacyRecordingMetadata({ interviewId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" }))
      .resolves.toEqual({
        status: "repaired",
        videoKey: "user-1/interview-session-1.webm",
      });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        videoKey: null,
        videoUrl: { not: null },
      },
      data: { videoKey: "user-1/interview-session-1.webm" },
    });
  });

  it("repairs path-style S3 URLs by dropping the bucket path segment", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
      userId: "user-1",
      videoUrl: "https://s3.us-east-1.amazonaws.com/snap-recordings/user-1/interview-legacy.webm",
      videoKey: null,
    });

    await expect(repairLegacyRecordingMetadata({ interviewId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb" }))
      .resolves.toMatchObject({
        status: "repaired",
        videoKey: "user-1/interview-legacy.webm",
      });
  });

  it("rejects derived keys outside the interview owner prefix", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
      userId: "user-1",
      videoUrl: "https://snap-recordings.s3.us-east-1.amazonaws.com/user-2/interview-legacy.webm",
      videoKey: null,
    });

    await expect(repairLegacyRecordingMetadata({ interviewId: "cccccccc-cccc-4ccc-cccc-cccccccccccc" }))
      .resolves.toEqual({
        status: "not_repairable",
        reason: "outside_user_prefix",
      });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("does not write metadata when configured S3 reports the object missing", async () => {
    mocks.isAwsS3Configured.mockReturnValue(true);
    mocks.s3ObjectExists.mockResolvedValue(false);
    mocks.findUnique.mockResolvedValue({
      id: "dddddddd-dddd-4ddd-dddd-dddddddddddd",
      userId: "user-1",
      videoUrl: "https://snap-recordings.s3.us-east-1.amazonaws.com/user-1/interview-legacy.webm",
      videoKey: null,
    });

    await expect(repairLegacyRecordingMetadata({ interviewId: "dddddddd-dddd-4ddd-dddd-dddddddddddd" }))
      .resolves.toEqual({
        status: "missing_object",
        videoKey: "user-1/interview-legacy.webm",
      });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns already_linked when another row already owns the derived videoKey", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee",
      userId: "user-1",
      videoUrl: "https://snap-recordings.s3.us-east-1.amazonaws.com/user-1/interview-legacy.webm",
      videoKey: null,
    });
    mocks.updateMany.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));

    await expect(repairLegacyRecordingMetadata({ interviewId: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee" }))
      .resolves.toEqual({
        status: "already_linked",
        videoKey: "user-1/interview-legacy.webm",
      });
  });
});
