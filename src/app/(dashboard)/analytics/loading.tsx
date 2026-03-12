import { FadeIn, FadeInStagger, FadeInStaggerItem, SlideIn } from "@/components/ui/motion";

export default function AnalyticsLoading() {
    return (
        <div className="space-y-7 w-full animate-pulse">
            {/* Header Skeleton */}
            <SlideIn>
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-3">
                        <div className="h-8 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-4 w-72 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                    </div>
                    <div className="h-10 w-40 rounded-xl bg-zinc-200" />
                </div>
            </SlideIn>

            {/* 3 Stat Cards Skeleton */}
            <FadeInStagger triggerOnView={false} className="grid gap-3.5 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <FadeInStaggerItem key={i} className="rounded-2xl border border-zinc-200 bg-white p-4.5">
                        <div className="h-4 w-24 rounded bg-zinc-100 mb-3" />
                        <div className="h-8 w-16 rounded-lg bg-zinc-200 mb-2" />
                        <div className="h-3 w-32 rounded bg-zinc-50" />
                    </FadeInStaggerItem>
                ))}
            </FadeInStagger>

            {/* 2 Main Charts Skeleton */}
            <div className="grid gap-4.5 lg:grid-cols-2">
                <FadeIn delay={0.2} direction="up" className="rounded-xl border border-zinc-200 bg-white p-6">
                    <div className="h-5 w-40 rounded bg-zinc-200 mb-6" />
                    <div className="h-48 w-full rounded bg-zinc-50" />
                </FadeIn>
                <FadeIn delay={0.3} direction="up" className="rounded-xl border border-zinc-200 bg-white p-6">
                    <div className="h-5 w-40 rounded bg-zinc-200 mb-6" />
                    <div className="h-48 w-full rounded bg-zinc-50" />
                </FadeIn>
            </div>

            {/* 2 Sub Lists Skeleton (Strengths & Weaknesses) */}
            <div className="grid gap-6 lg:grid-cols-2 pb-8">
                <FadeIn delay={0.4} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="h-5 w-32 rounded bg-zinc-200 mb-2" />
                    <div className="h-3 w-48 rounded bg-zinc-100 mb-5" />
                    <div className="space-y-2.5">
                        {[...Array(3)].map((_, j) => (
                            <div key={`s-${j}`} className="h-12 w-full rounded-lg bg-zinc-50" />
                        ))}
                    </div>
                </FadeIn>
                <FadeIn delay={0.5} direction="up" className="rounded-2xl border border-zinc-200 bg-white p-6">
                    <div className="h-5 w-32 rounded bg-zinc-200 mb-2" />
                    <div className="h-3 w-48 rounded bg-zinc-100 mb-5" />
                    <div className="space-y-2.5">
                        {[...Array(3)].map((_, j) => (
                            <div key={`w-${j}`} className="h-12 w-full rounded-lg bg-zinc-50" />
                        ))}
                    </div>
                </FadeIn>
            </div>
        </div>
    );
}
