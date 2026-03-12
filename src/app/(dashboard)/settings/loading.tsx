import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function SettingsLoading() {
    return (
        <div className="space-y-5 pb-8 w-full animate-pulse">
            {/* Header Skeleton */}
            <SlideIn>
                <div className="space-y-3">
                    <div className="h-8 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-64 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                </div>
            </SlideIn>

            <FadeIn delay={0.1} direction="up">
                <div className="flex gap-6 mt-6">
                    {/* Left Sidebar Tabs Skeleton */}
                    <nav className="w-56 shrink-0">
                        <div className="space-y-1 rounded-2xl border border-zinc-200 bg-white p-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 ${i === 0 ? "bg-zinc-900" : "bg-transparent"}`}>
                                    <div className={`h-4 w-4 rounded-sm ${i === 0 ? "bg-zinc-700" : "bg-zinc-100"}`} />
                                    <div className="space-y-2">
                                        <div className={`h-3 w-24 rounded ${i === 0 ? "bg-zinc-700" : "bg-zinc-200"}`} />
                                        <div className={`h-2 w-16 rounded ${i === 0 ? "bg-zinc-800" : "bg-zinc-100"}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </nav>

                    {/* Right Content Area Skeleton */}
                    <div className="flex-1 rounded-2xl border border-zinc-200 bg-white min-h-[500px] p-8 space-y-8">
                        {/* Fake Profile Tab Content */}
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 rounded-full bg-zinc-100" />
                            <div className="space-y-3 flex-1">
                                <div className="h-5 w-48 rounded bg-zinc-200" />
                                <div className="h-4 w-32 rounded bg-zinc-100" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="h-4 w-24 rounded bg-zinc-200" />
                                <div className="h-10 w-full max-w-md rounded-lg bg-zinc-50 border border-zinc-100" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 w-24 rounded bg-zinc-200" />
                                <div className="h-10 w-full max-w-md rounded-lg bg-zinc-50 border border-zinc-100" />
                            </div>
                            <div className="h-10 w-32 rounded-lg bg-zinc-200 mt-4" />
                        </div>
                    </div>
                </div>
            </FadeIn>
        </div>
    );
}
