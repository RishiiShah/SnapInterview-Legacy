import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Create Account",
    description: "Sign up for SnapInterview to start practicing AI mock interviews and get instant feedback.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
