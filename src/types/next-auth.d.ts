import type { DefaultSession } from "next-auth";
import "next-auth";

declare module "next-auth" {
    interface User {
        isFirstLogin?: boolean;
        onboardingCompleted?: boolean;
        onboardingRole?: string | null;
        onboardingLevel?: string | null;
        onboardingCompany?: string | null;
        onboardingGoal?: string | null;
        preferredInterviewType?: string | null;
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            isFirstLogin?: boolean;
            onboardingCompleted?: boolean;
            onboardingRole?: string | null;
            onboardingLevel?: string | null;
            onboardingCompany?: string | null;
            onboardingGoal?: string | null;
            preferredInterviewType?: string | null;
        } & DefaultSession["user"];
    }
}
