import PracticePageClient from "@/components/practice/PracticePageClient";
import { parsePracticeRetakeDefaults, type PracticeRetakeSearchParams } from "@/lib/practice/retake-defaults";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { normalizeOnboardingFormValues } from "@/lib/onboarding/preferences";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type PracticePageProps = {
  searchParams?: Promise<PracticeRetakeSearchParams>;
};

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const [identity, resolvedSearchParams] = await Promise.all([
    getSessionUserIdentity(),
    searchParams ?? Promise.resolve(undefined),
  ]);

  if (!identity) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: {
      onboardingRole: true,
      onboardingLevel: true,
      onboardingCompany: true,
      onboardingGoal: true,
      preferredInterviewType: true,
      resumeText: true,
    },
  });
  const retakeDefaults = parsePracticeRetakeDefaults(resolvedSearchParams);
  const practiceClientKey = JSON.stringify(retakeDefaults);

  return (
    <PracticePageClient
      key={practiceClientKey}
      retakeDefaults={retakeDefaults}
      initialDefaults={{
        onboarding: normalizeOnboardingFormValues(user),
        resumeText: user?.resumeText ?? null,
      }}
    />
  );
}
