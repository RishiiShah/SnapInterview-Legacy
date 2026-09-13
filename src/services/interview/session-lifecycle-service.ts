import { Prisma, type InterviewStatus } from "@/generated/prisma/client";
import { INTERVIEW_RESUME_WINDOW_MS } from "@/lib/interview/constants";
import { invalidateInterviewMetricsCache } from "@/lib/interview/metrics";
import {
  coerceInterviewLevel,
  getDefaultInterviewLevelForDifficulty,
  getRandomQuestionCountForDuration,
  type InterviewDuration,
  type InterviewPersona,
  type StartInterviewSessionInput,
} from "@/lib/interview/domain";
import { buildInterviewBrief } from "@/lib/interview/brief";
import { getUserOnboardingContext } from "@/repositories/user-repo";
import { isCuratedCompany } from "@/lib/company-options";
import {
  createInterviewSession,
  expireInterviewSessionIfStale,
  getInterviewSession,
  updateInterviewSessionStatus,
} from "@/repositories/interview-repo";
import { getInterviewPlan } from "@/repositories/plan-repo";
import type { InterviewNodeConfig } from "@/lib/plans/graph";
import { roundProfileSchema } from "@/lib/plans/contracts";

export const ALLOWED_STATUSES = ["COMPLETED", "ABORTED"] as const;
export const INTERVIEW_GRACE_PERIOD_MS = 60_000; // 60s grace warning/period before hard stop
export { INTERVIEW_RESUME_WINDOW_MS } from "@/lib/interview/constants";

export class PlanSessionContextError extends Error {
  constructor(public readonly status: 404 | 409, message: string) {
    super(message);
  }
}

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

  let planContext: {
    planId: string;
    nodeId: string;
    target: NonNullable<Awaited<ReturnType<typeof getInterviewPlan>>>["target"];
    roundProfile: NonNullable<InterviewNodeConfig["round_profile"]>;
  } | null = null;
  let effectiveType = params.type;
  let effectiveDifficulty = params.difficulty;
  let effectiveDuration = params.durationMinutes;
  let effectiveRole = params.role;
  let effectiveCompany = params.company;
  let effectiveLevel = params.level;
  let effectiveJobDescription = params.jobDescription;

  if (params.planContext) {
    const plan = await getInterviewPlan(params.userId, params.planContext.planId);
    if (!plan) throw new PlanSessionContextError(404, "Interview plan not found.");
    const node = plan.nodes.find((candidate) => candidate.id === params.planContext!.nodeId);
    if (!node || node.type !== "interview") throw new PlanSessionContextError(404, "Interview plan round not found.");
    if (node.status !== "in_progress") throw new PlanSessionContextError(409, "Start this plan round before creating its interview session.");
    const config = node.config as InterviewNodeConfig;
    const parsedRoundProfile = roundProfileSchema.safeParse(config.round_profile);
    if (!plan.target || !parsedRoundProfile.success) throw new PlanSessionContextError(409, "This plan round has no valid targeted interview context.");
    effectiveType = config.interview_type;
    effectiveDifficulty = config.difficulty;
    effectiveDuration = config.duration_minutes;
    effectiveRole = plan.target.role;
    effectiveCompany = plan.target.company;
    effectiveLevel = plan.target.level;
    effectiveJobDescription = plan.target.job_description;
    planContext = {
      planId: plan.id,
      nodeId: node.id,
      target: plan.target,
      roundProfile: parsedRoundProfile.data,
    };
  }

  const durationMinutes: InterviewDuration = effectiveDuration ?? 30;
  const questionCount: number =
    params.questionCount ?? getRandomQuestionCountForDuration(durationMinutes);
  const persona: InterviewPersona = params.persona ?? "balanced";
  const requestedRole = typeof effectiveRole === "string" ? effectiveRole.trim() : "";
  const onboardingRole =
    typeof user?.onboardingRole === "string" ? user.onboardingRole.trim() : "";
  const role = requestedRole || onboardingRole || "Software Engineer";
  const onboardingCompany =
    user?.onboardingCompany && isCuratedCompany(user.onboardingCompany)
      ? user.onboardingCompany
      : null;
  const company = effectiveCompany ?? onboardingCompany ?? null;
  const level =
    effectiveLevel ??
    coerceInterviewLevel(user?.onboardingLevel) ??
    getDefaultInterviewLevelForDifficulty(effectiveDifficulty);

  const brief = await buildInterviewBrief({
    role,
    company,
    type: effectiveType,
    difficulty: effectiveDifficulty,
    durationMinutes,
    persona,
    level,
    onboardingGoal: user?.onboardingGoal,
    jobDescription: effectiveJobDescription,
    resumeText: params.resumeText,
    roundProfile: planContext?.roundProfile,
  });

  const focusAreas = brief.agenda.pillars.map((p) => p.title).slice(0, 5);
  const sessionPlan: Record<string, unknown> = {
    version: planContext ? 2 : 1,
    brief,
    agenda: brief.agenda,
    ...(planContext ? {
      planContext: {
        planId: planContext.planId,
        nodeId: planContext.nodeId,
        target: planContext.target,
        roundProfile: planContext.roundProfile,
      },
    } : {}),
  };

  const { planContext: _requestedPlanContext, ...sessionParams } = params;
  const session = await createInterviewSession({
    ...sessionParams,
    role,
    company,
    type: effectiveType,
    difficulty: effectiveDifficulty,
    level,
    persona,
    durationMinutes,
    questionCount,
    jobDescription: effectiveJobDescription,
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
