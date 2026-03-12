import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";

const CHART_SKELETON_HEIGHTS = [45, 72, 38, 60, 55, 80, 42];

export default function DashboardLoading() {
    return (
        <div className="space-y-4 pb-8 w-full animate-pulse">
            {/* Header Skeleton */}
            <SlideIn>
                <div className="mb-8 space-y-3">
                    <div className="h-8 w-64 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-96 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                </div>
            </SlideIn>

            {/* Stats Cards Skeleton */}
            <FadeInStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <FadeInStaggerItem key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="mb-2 flex justify-between">
                            <div className="h-4 w-24 rounded bg-zinc-100" />
                            <div className="h-5 w-5 rounded bg-zinc-100" />
                        </div>
                        <div className="mt-4 h-8 w-16 rounded-lg bg-zinc-200" />
                        <div className="mt-3 h-3 w-32 rounded bg-zinc-50" />
                    </FadeInStaggerItem>
                ))}
            </FadeInStagger>

            {/* Quick Actions Skeleton */}
            <SlideIn delay={0.2}>
                <div className="flex flex-wrap gap-3 py-1 mt-4">
                    <div className="h-10 w-44 rounded-xl bg-zinc-200" />
                    <div className="h-10 w-44 rounded-xl bg-zinc-100" />
                </div>
            </SlideIn>

            {/* Main Content Area Skeleton */}
            <FadeIn delay={0.4} direction="up">
                <div className="grid gap-4 lg:grid-cols-5 mt-4">
                    {/* Chart Area Skeleton */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2">
                        <div className="mb-6 h-5 w-32 rounded bg-zinc-100" />
                        <div className="flex h-48 items-end justify-between gap-2">
                            {CHART_SKELETON_HEIGHTS.map((h, i) => (
                                <div key={i} className="w-full rounded-t-sm bg-zinc-100" style={{ height: `${h}%` }} />
                            ))}
                        </div>
                    </div>

                    {/* List Area Skeleton */}
                    <div className="rounded-2xl border border-zinc-200 bg-white lg:col-span-3">
                        <div className="border-b border-zinc-100 px-6 py-5">
                            <div className="h-5 w-36 rounded bg-zinc-100" />
                        </div>
                        <div>
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center justify-between px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-zinc-100" />
                                        <div className="space-y-2">
                                            <div className="h-4 w-40 rounded bg-zinc-200" />
                                            <div className="h-3 w-24 rounded bg-zinc-100" />
                                        </div>
                                    </div>
                                    <div className="h-6 w-16 rounded-full bg-zinc-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </FadeIn>
        </div>
    );
}
