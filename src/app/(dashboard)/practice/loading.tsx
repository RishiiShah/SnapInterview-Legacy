import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function PracticeLoading() {
    return (
        <div className="space-y-8 pb-8 w-full animate-pulse">
            {/* Header Skeleton */}
            <SlideIn>
                <div className="space-y-3">
                    <div className="h-8 w-56 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-72 rounded-md bg-zinc-100 dark:bg-zinc-900" />
                </div>
            </SlideIn>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column (Setup Form) Skeleton */}
                <FadeIn delay={0.2} direction="up" className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                        <div className="mb-6 h-6 w-40 rounded-lg bg-zinc-200" />
                        
                        <div className="space-y-5">
                            {/* Role / Company Selectors */}
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <div className="h-4 w-24 rounded bg-zinc-100" />
                                    <div className="h-10 w-full rounded-lg bg-zinc-50 border border-zinc-100" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-4 w-20 rounded bg-zinc-100" />
                                    <div className="h-10 w-full rounded-lg bg-zinc-50 border border-zinc-100" />
                                </div>
                            </div>

                            {/* 5 Dropdowns */}
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="h-4 w-20 rounded bg-zinc-100" />
                                        <div className="h-10 w-full rounded-lg bg-zinc-50 border border-zinc-100" />
                                    </div>
                                ))}
                            </div>

                            {/* Textarea */}
                            <div className="space-y-2">
                                <div className="h-4 w-32 rounded bg-zinc-100" />
                                <div className="h-32 w-full rounded-lg bg-zinc-50 border border-zinc-100" />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="mt-8 h-12 w-full rounded-xl bg-zinc-200" />
                    </div>
                </FadeIn>

                {/* Right Column (Recent Practice + Tips) Skeleton */}
                <FadeIn delay={0.4} direction="up" className="space-y-4">
                    {/* Recent Practice */}
                    <div className="rounded-2xl border border-zinc-200 bg-white">
                        <div className="border-b border-zinc-100 px-5 py-4">
                            <div className="h-5 w-32 rounded bg-zinc-200" />
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="px-5 py-4 space-y-2">
                                    <div className="flex justify-between">
                                        <div className="h-4 w-32 rounded bg-zinc-200" />
                                        <div className="h-4 w-12 rounded bg-zinc-100" />
                                    </div>
                                    <div className="h-3 w-40 rounded bg-zinc-100" />
                                    <div className="h-5 w-20 rounded-full bg-zinc-50 mt-1" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                        <div className="mb-4 h-5 w-24 rounded bg-zinc-200" />
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-2">
                                    <div className="h-2 w-2 rounded-full bg-zinc-200 mt-1" />
                                    <div className="h-3 w-full rounded bg-zinc-100" />
                                </div>
                            ))}
                        </div>
                    </div>
                </FadeIn>
            </div>
        </div>
    );
}
