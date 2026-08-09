"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { ADMIN_OVERVIEW_STATS_TAG } from "@/lib/admin/overview-stats";
import { repairLegacyRecordingMetadata } from "@/lib/admin/recording-repair";
import { hardDeleteInterviewSessionById } from "@/lib/interview/hard-delete-session";
import { prisma } from "@/lib/prisma";

export async function addInterviewModerationNoteAction(formData: FormData) {
  const session = await requireAdminSession();

  const interviewId = String(formData.get("interviewId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!interviewId || !note) {
    return;
  }

  const interview = await prisma.interviewSession.findUnique({
    where: { id: interviewId },
    select: { id: true },
  });
  if (!interview) {
    return;
  }

  await prisma.interviewModerationNote.create({
    data: {
      interviewSessionId: interviewId,
      authorEmail: session.user.email ?? "unknown@snapinterview.local",
      note,
    },
  });

  revalidatePath(`/admin/interviews/${interviewId}`);
  revalidatePath("/admin/interviews");
}

export async function hardDeleteInterviewAction(formData: FormData) {
  await requireAdminSession();

  const id = String(formData.get("interviewId") ?? "").trim();
  if (!id) return;

  const deleted = await hardDeleteInterviewSessionById(id);
  if (!deleted) return;

  revalidatePath("/admin/interviews");
  revalidateTag(ADMIN_OVERVIEW_STATS_TAG, "max");
  revalidateTag("admin-analytics-v1", "max");
  redirect("/admin/interviews");
}

export async function repairLegacyRecordingMetadataAction(formData: FormData) {
  await requireAdminSession();

  const interviewId = String(formData.get("interviewId") ?? "").trim();
  if (!interviewId) {
    return;
  }

  await repairLegacyRecordingMetadata({ interviewId });

  revalidatePath("/admin/interviews");
  revalidatePath(`/admin/interviews/${interviewId}`);
}
