import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function QuestionsLoading() {
    return (
        <div className="space-y-6 pb-8 w-full animate-pulse">
            {/* Header Skeleton */}
            <SlideIn>
                <div className="space-y-3">
                    <div className="h-8 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-64 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                </div>
            </SlideIn>

            {/* Filter Bar Skeleton */}
            <FadeIn delay={0.1} direction="up">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="h-10 w-full max-w-sm rounded-lg bg-zinc-100" />
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-32 rounded-lg bg-zinc-100" />
                            <div className="h-10 w-10 rounded-lg bg-zinc-100" />
                        </div>
                    </div>
                    
                    {/* Stats row placeholder */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100 mt-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-8 w-32 rounded-lg bg-zinc-50 border border-zinc-100" />
                        ))}
                    </div>
                </div>
            </FadeIn>

            <FadeIn delay={0.25} direction="up">
                <div className="h-4 w-40 rounded bg-zinc-100" /> {/* "Showing X of Y questions" text */}
            </FadeIn>

            {/* Table Skeleton */}
            <FadeIn delay={0.3} direction="up">
                <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
                    <div className="border-b border-zinc-200 bg-zinc-50/50 px-6 py-3 flex gap-4">
                        <div className="h-5 w-4 rounded bg-zinc-200" /> {/* Status */}
                        <div className="h-5 w-64 rounded bg-zinc-200 flex-1" /> {/* Title */}
                        <div className="h-5 w-24 rounded bg-zinc-200" /> {/* Category */}
                        <div className="h-5 w-20 rounded bg-zinc-200" /> {/* Difficulty */}
                        <div className="h-5 w-16 rounded bg-zinc-200" /> {/* Time */}
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4">
                                <div className="h-5 w-5 rounded-full bg-zinc-100" />
                                <div className="h-5 w-64 rounded bg-zinc-100 flex-1" />
                                <div className="h-6 w-24 rounded-full bg-zinc-50" />
                                <div className="h-5 w-16 rounded bg-zinc-100" />
                                <div className="h-5 w-12 rounded bg-zinc-100" />
                            </div>
                        ))}
                    </div>
                </div>
            </FadeIn>
        </div>
    );
}
