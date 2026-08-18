import { Prisma, type InterviewStatus } from "@/generated/prisma/client";
import { INTERVIEW_RESUME_WINDOW_MS } from "@/lib/interview/constants";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import {
  type InterviewDuration,
  type InterviewPersona,
  type StartInterviewSessionInput,
} from "@/lib/interview/domain";
import { buildInterviewBrief } from "@/lib/interview/brief";
import { getUserOnboardingContext } from "@/repositories/user-repo";
import {
  createInterviewSession,
  expireInterviewSessionIfStale,
  getInterviewSession,
  updateInterviewSessionStatus,
} from "@/repositories/interview-repo";

export const ALLOWED_STATUSES = ["COMPLETED", "ABORTED"] as const;
export const INTERVIEW_GRACE_PERIOD_MS = 60_000; // 60s grace warning/period before hard stop
export { INTERVIEW_RESUME_WINDOW_MS } from "@/lib/interview/constants";

function handleSessionUpdateError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("videoKey")
  ) {
    return { type: "conflict" as const, message: "Video recording is already linked to another interview session." };
  }

  throw error;
}

export async function getInterviewSessionState(params: { userId: string; interviewId: string }) {
  return getInterviewSession({ ...params, view: "state" });
}

export async function getResumableInterviewSessionState(params: {
  userId: string;
  interviewId: string;
  now?: Date;
}) {
  const { userId, interviewId, now = new Date() } = params;
  const cutoff = new Date(now.getTime() - INTERVIEW_RESUME_WINDOW_MS);
  const expired = await expireInterviewSessionIfStale({ interviewId, userId, cutoff });

  if (expired) {
    invalidateInterviewMetricsCache(userId);
    return { type: "expired" as const };
  }

  const session = await getInterviewSession({ interviewId, userId, view: "state" });
  if (!session || session.status !== "IN_PROGRESS") {
    return { type: "not_found" as const };
  }

  return { type: "ok" as const, data: session };
}

export async function startInterviewSession(params: StartInterviewSessionInput) {
  const user = await getUserOnboardingContext(params.userId);

  const durationMinutes: InterviewDuration = params.durationMinutes ?? 30;
  const questionCount: number =
    params.questionCount ??
    (durationMinutes === 15 ? 5 : durationMinutes === 45 ? 15 : 10);
  const persona: InterviewPersona = params.persona ?? "balanced";
  const role = params.role || user?.onboardingRole || "Generalist";
  const company = params.company ?? user?.onboardingCompany ?? null;

  const brief = await buildInterviewBrief({
    role,
    company,
    type: params.type,
    difficulty: params.difficulty,
    durationMinutes,
    persona,
    onboardingLevel: user?.onboardingLevel,
    onboardingGoal: user?.onboardingGoal,
    jobDescription: params.jobDescription,
    resumeText: params.resumeText,
  });

  const focusAreas = brief.agenda.pillars.map((p) => p.title).slice(0, 5);
  const sessionPlan: Record<string, unknown> = {
    version: 1,
    brief,
    agenda: brief.agenda,
  };

  const session = await createInterviewSession({
    ...params,
    role,
    company,
    persona,
    durationMinutes,
    questionCount,
    focusAreas: focusAreas as unknown as Prisma.InputJsonValue,
    sessionPlan: sessionPlan as unknown as Prisma.InputJsonValue,
  });

  invalidateInterviewMetricsCache(params.userId);
  return session;
}

export async function updateSessionStatusIfOwned(params: {
  userId: string;
  interviewId: string;
  videoUrl?: string | null;
  videoKey?: string | null;
  status?: InterviewStatus;
}) {
  const { userId, interviewId, videoUrl, videoKey, status } = params;
  const existing = await getInterviewSession({ interviewId, userId, view: "state" });

  if (!existing) {
    return { type: "not_found" as const };
  }

  // Idempotency: If already finalized, only allow updating videoUrl if it's currently null.
  if (existing.status !== "IN_PROGRESS") {
    if ((videoUrl && !existing.videoUrl) || (videoKey && !existing.videoKey)) {
      try {
        const updated = await updateInterviewSessionStatus({ interviewId, userId, videoUrl, videoKey });
        invalidateInterviewMetricsCache(userId);
        return { type: "ok" as const, data: updated };
      } catch (error) {
        return handleSessionUpdateError(error);
      }
    }
    return { type: "ok" as const, data: existing };
  }

  try {
    const updated = await updateInterviewSessionStatus({ interviewId, userId, videoUrl, videoKey, status });
    invalidateInterviewMetricsCache(userId);
    return { type: "ok" as const, data: updated };
  } catch (error) {
    return handleSessionUpdateError(error);
  }
}
