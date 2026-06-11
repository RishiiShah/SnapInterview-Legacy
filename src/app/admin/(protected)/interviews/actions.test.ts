import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  redirect: vi.fn(),
  requireAdminSession: vi.fn(),
  repairLegacyRecordingMetadata: vi.fn(),
  hardDeleteInterviewSessionById: vi.fn(),
  prismaFindUnique: vi.fn(),
  prismaCreateNote: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/admin-auth", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/lib/admin/recording-repair", () => ({
  repairLegacyRecordingMetadata: mocks.repairLegacyRecordingMetadata,
}));

vi.mock("@/lib/admin/overview-stats", () => ({
  ADMIN_OVERVIEW_STATS_TAG: "admin-overview",
}));

vi.mock("@/lib/interview/hard-delete-session", () => ({
  hardDeleteInterviewSessionById: mocks.hardDeleteInterviewSessionById,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findUnique: mocks.prismaFindUnique,
    },
    interviewModerationNote: {
      create: mocks.prismaCreateNote,
    },
  },
}));

import { repairLegacyRecordingMetadataAction } from "./actions";

describe("admin interview actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminSession.mockResolvedValue({ user: { email: "admin@example.com" } });
    mocks.repairLegacyRecordingMetadata.mockResolvedValue({
      status: "repaired",
      videoKey: "user-1/interview-legacy.webm",
    });
  });

  it("repairs legacy recording metadata and revalidates admin interview pages", async () => {
    const formData = new FormData();
    formData.set("interviewId", "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");

    await expect(repairLegacyRecordingMetadataAction(formData)).resolves.toBeUndefined();

    expect(mocks.requireAdminSession).toHaveBeenCalledOnce();
    expect(mocks.repairLegacyRecordingMetadata).toHaveBeenCalledWith({
      interviewId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/interviews");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/interviews/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
  });

  it("does not call the repair helper when interviewId is missing", async () => {
    const formData = new FormData();

    await expect(repairLegacyRecordingMetadataAction(formData)).resolves.toBeUndefined();

    expect(mocks.requireAdminSession).toHaveBeenCalledOnce();
    expect(mocks.repairLegacyRecordingMetadata).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
