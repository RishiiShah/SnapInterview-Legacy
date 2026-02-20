import Link from "next/link";

interface AuthSidePanelProps {
    title: string;
    subtitle: string;
    author?: string;
    showStats?: boolean;
}

export function AuthSidePanel({ title, subtitle, author, showStats = false }: AuthSidePanelProps) {
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
                <h2 className="max-w-sm text-3xl font-bold leading-tight text-white">
                    {title}
                </h2>
                {author ? (
                    <>
                        <blockquote className="max-w-md mt-4 text-lg leading-relaxed text-zinc-400">
                            {subtitle}
                        </blockquote>
                        <p className="mt-4 text-sm font-medium text-zinc-500">
                            {author}
                        </p>
                    </>
                ) : (
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                        {subtitle}
                    </p>
                )}

                {showStats && (
                    <div className="mt-8 flex items-center gap-6">
                        {[
                            { value: "50k+", label: "Users" },
                            { value: "93%", label: "Success" },
                            { value: "4.9/5", label: "Rating" },
                        ].map((s) => (
                            <div key={s.label}>
                                <p className="text-lg font-bold text-white">{s.value}</p>
                                <p className="text-xs text-zinc-500">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-xs text-zinc-600">
                © {new Date().getFullYear()} SnapInterview
            </p>
        </div>
    );
}
