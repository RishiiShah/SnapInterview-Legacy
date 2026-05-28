import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";

interface AuthSidePanelProps {
    title: string;
    subtitle: string;
}

export function AuthSidePanel({ title, subtitle }: AuthSidePanelProps) {
    return (
        <div className="hidden w-1/2 flex-col justify-between bg-zinc-900 p-12 lg:flex">
            <Link href="/" className="flex items-center gap-1.5">
                <AppLogo size={32} />
                <span className="text-lg font-semibold tracking-tight text-white">
                    SnapInterview
                </span>
            </Link>

            <div>
                <h2 className="max-w-sm text-3xl font-bold leading-tight text-white tracking-tight">
                    {title}
                </h2>
                <p className="mt-6 max-w-sm text-lg leading-relaxed text-zinc-400">
                    {subtitle}
                </p>
            </div>

            <p className="text-xs text-zinc-600">
                © {new Date().getFullYear()} SnapInterview
            </p>
        </div>
    );
}
