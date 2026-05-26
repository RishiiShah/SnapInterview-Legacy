import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Log In",
    description: "Log in to your SnapInterview account to continue practicing AI mock interviews.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
