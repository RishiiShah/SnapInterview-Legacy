import { redirect } from "next/navigation";
import { AuthHeader, AuthShell } from "@/components/auth/AuthShell";
import OnboardingPreferencesForm from "@/components/onboarding/OnboardingPreferencesForm";
import { normalizeOnboardingFormValues } from "@/lib/onboarding/preferences";
import { getServerAuthSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id ?? session.session?.userId;
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingCompletedAt: true,
      onboardingRole: true,
      onboardingLevel: true,
      onboardingCompany: true,
      onboardingGoal: true,
      preferredInterviewType: true,
    },
  });

  if (user?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <AuthShell contentClassName="w-full max-w-xl">
      <AuthHeader
        title="Set up your profile"
        description="Role and company shape your mocks from the first session. Leave company blank for General."
        align="center"
      />

      <OnboardingPreferencesForm
        initialValues={normalizeOnboardingFormValues(user ?? session.user)}
        submitLabel="Complete setup"
        showInterviewTypeField={true}
        redirectTo="/dashboard"
        tone="dark"
        chrome="plain"
      />
    </AuthShell>
  );
}
