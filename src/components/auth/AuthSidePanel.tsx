import Link from "next/link";

interface AuthSidePanelProps {
    title: string;
    subtitle: string;
}

export function AuthSidePanel({ title, subtitle }: AuthSidePanelProps) {
    return (
        <div className="hidden w-1/2 flex-col justify-between bg-zinc-900 p-12 lg:flex">
            <Link href="/" className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[11px] font-bold leading-none tracking-tighter text-zinc-900">
                    SI
                </div>
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
