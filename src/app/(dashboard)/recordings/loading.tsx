import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function RecordingsLoading() {
    return (
        <div className="space-y-8 pb-8 w-full animate-pulse">
            {/* Header Skeleton */}
            <SlideIn>
                <div className="space-y-3">
                    <div className="h-8 w-40 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-72 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                </div>
            </SlideIn>

            {/* Video Cards Grid Skeleton */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                    <FadeIn key={i} delay={i * 0.08} direction="up" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white flex flex-col">
                        {/* Video Thumbnail Placeholder */}
                        <div className="relative aspect-video bg-zinc-100 flex items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-zinc-200" />
                        </div>
                        
                        {/* Card Content Placeholder */}
                        <div className="flex flex-1 flex-col p-4">
                            <div className="mb-1 flex items-center justify-between gap-3">
                                <div className="h-4 w-32 rounded bg-zinc-200" />
                                <div className="h-8 w-8 rounded-lg bg-zinc-100" /> {/* Delete btn placeholder */}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <div className="h-3 w-24 rounded bg-zinc-100" />
                                <div className="h-3 w-16 rounded bg-zinc-100" />
                            </div>
                        </div>
                    </FadeIn>
                ))}
            </div>
        </div>
    );
}
