type AuthUserSource = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isFirstLogin?: boolean | null;
  onboardingCompleted?: boolean | null;
  onboardingCompletedAt?: Date | null;
  onboardingRole?: string | null;
  onboardingLevel?: string | null;
  onboardingCompany?: string | null;
  onboardingGoal?: string | null;
  preferredInterviewType?: string | null;
};

type AuthUserOverrides = {
  name?: string | null;
};

export function mapAuthUserFields(user: AuthUserSource, overrides?: AuthUserOverrides) {
  return {
    id: user.id,
    name: overrides?.name ?? user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    isFirstLogin: user.isFirstLogin ?? true,
    onboardingCompleted: user.onboardingCompleted ?? Boolean(user.onboardingCompletedAt),
    onboardingRole: user.onboardingRole ?? null,
    onboardingLevel: user.onboardingLevel ?? null,
    onboardingCompany: user.onboardingCompany ?? null,
    onboardingGoal: user.onboardingGoal ?? null,
    preferredInterviewType: user.preferredInterviewType ?? null,
  };
}
