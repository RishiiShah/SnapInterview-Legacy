export default function QuestionDetailLoading() {
    return (
        <div className="-m-6 -mb-2 flex h-[calc(100vh-64px)] flex-col bg-zinc-50 animate-pulse">
            {/* Top Bar Skeleton */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
                <div className="h-4 w-24 rounded bg-zinc-200" />
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-100" />
                    <div className="h-3 w-12 rounded bg-zinc-200" />
                    <div className="h-8 w-8 rounded-lg bg-zinc-100" />
                </div>
            </div>

            {/* Split Panels */}
            <div className="flex flex-1 min-h-0">
                {/* Left Panel Skeleton */}
                <div className="flex w-1/2 flex-col border-r border-zinc-200 bg-white">
                    <div className="flex shrink-0 items-center gap-1 border-b border-zinc-100 px-4 h-12">
                        <div className="h-4 w-24 rounded bg-zinc-200" />
                        <div className="h-4 w-24 rounded bg-zinc-100 ml-4" />
                    </div>
                    
                    <div className="flex-1 p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="h-7 w-3/4 rounded-lg bg-zinc-200" />
                            <div className="h-5 w-20 rounded-full bg-sky-50" />
                        </div>
                        
                        <div className="space-y-4">
                            <div className="h-3 w-full rounded bg-zinc-100" />
                            <div className="h-3 w-full rounded bg-zinc-100" />
                            <div className="h-3 w-5/6 rounded bg-zinc-100" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4">
                            <div className="space-y-2">
                                <div className="h-2 w-12 rounded bg-zinc-200" />
                                <div className="h-4 w-24 rounded bg-zinc-100" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 w-12 rounded bg-zinc-200" />
                                <div className="h-4 w-24 rounded bg-zinc-100" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel Skeleton */}
                <div className="flex flex-col w-1/2 bg-white">
                    <div className="flex shrink-0 items-center border-b border-zinc-100 px-4 h-12">
                        <div className="h-4 w-24 rounded bg-zinc-200" />
                    </div>
                    
                    <div className="flex flex-1 flex-col items-center justify-center px-10">
                        <div className="mb-6 h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-100" />
                        <div className="mb-2 h-4 w-40 rounded bg-zinc-200" />
                        <div className="mb-8 h-3 w-64 rounded bg-zinc-100" />
                        <div className="h-10 w-40 rounded-xl bg-zinc-900/10" />
                    </div>

                    <div className="shrink-0 border-t border-zinc-200 bg-white">
                        <div className="flex items-center gap-1 border-b border-zinc-100 px-4 h-12">
                            <div className="h-4 w-20 rounded bg-zinc-200" />
                        </div>
                        <div className="px-5 py-4">
                            <div className="h-10 w-32 rounded-xl bg-sky-100" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
