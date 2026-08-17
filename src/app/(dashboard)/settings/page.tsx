import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/server-auth";
import { normalizeOnboardingFormValues } from "@/lib/onboarding/preferences";
import SettingsPageClient from "./SettingsPageClient";

export default async function SettingsPage() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? session?.session?.userId;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      resumeText: true,
      onboardingRole: true,
      onboardingLevel: true,
      onboardingCompany: true,
      onboardingGoal: true,
      preferredInterviewType: true,
    },
  });

  const initialOnboardingPrefs = user
    ? normalizeOnboardingFormValues({
        onboardingRole: user.onboardingRole,
        onboardingLevel: user.onboardingLevel,
        onboardingCompany: user.onboardingCompany,
        onboardingGoal: user.onboardingGoal,
        preferredInterviewType: user.preferredInterviewType,
      })
    : null;

  return (
    <SettingsPageClient
      user={{
        name: session?.user?.name ?? "",
        email: session?.user?.email ?? "",
        image: session?.user?.image ?? null,
      }}
      initialResumeText={user?.resumeText ?? null}
      initialOnboardingPrefs={initialOnboardingPrefs}
    />
  );
}
