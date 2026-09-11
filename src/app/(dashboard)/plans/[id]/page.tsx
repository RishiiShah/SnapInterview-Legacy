import { notFound, redirect } from "next/navigation";

import PlanEditorClient from "@/components/plans/PlanEditorClient";
import { prisma } from "@/lib/prisma";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { getAllPracticeQuestions } from "@/repositories/question-repo";
import { getUserInterviewPlan, PlanServiceError } from "@/services/plan-service";

export default async function InterviewPlanEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const identity = await getSessionUserIdentity();
  if (!identity) redirect("/login");
  const { id } = await params;
  const plan = await getUserInterviewPlan(identity.userId, id).catch((error: unknown) => {
    if (error instanceof PlanServiceError && error.status === 404) notFound();
    throw error;
  });
  const [questions, user] = await Promise.all([
    getAllPracticeQuestions(),
    prisma.user.findUnique({ where: { id: identity.userId }, select: { onboardingRole: true } }),
  ]);
  return <PlanEditorClient initialPlan={plan} questions={questions} defaultRole={user?.onboardingRole || "Software Engineer"} />;
}
