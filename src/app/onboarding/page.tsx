import { redirect } from "next/navigation";
import OnboardingPreferencesForm from "@/components/onboarding/OnboardingPreferencesForm";
import { normalizeOnboardingFormValues } from "@/lib/onboarding/preferences";
import { getServerAuthSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: {
          onboardingCompletedAt: true,
          onboardingRole: true,
          onboardingLevel: true,
          onboardingCompany: true,
          onboardingGoal: true,
          preferredInterviewType: true,
        },
      })
    : null;

  if (user?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 font-(family-name:--font-geist-sans)">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Setup</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Tailor SnapInterview to your search</h1>
          <p className="mx-auto max-w-2xl text-sm text-zinc-500">
            Tell us what you are targeting so the dashboard, reminders, and interview sessions can adapt from the start.
          </p>
        </div>

        <OnboardingPreferencesForm
          initialValues={normalizeOnboardingFormValues(user ?? session.user)}
          submitLabel="Complete setup"
          title="Your interview profile"
          description="These defaults will personalize your dashboard and seed new mock interviews."
          showInterviewTypeField={false}
          redirectTo="/dashboard"
        />
      </div>
    </div>
  );
}