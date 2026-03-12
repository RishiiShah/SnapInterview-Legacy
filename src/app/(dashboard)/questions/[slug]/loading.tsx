export default function QuestionDetailLoading() {
    return (
        <div className="-m-6 -mb-2 flex h-[calc(100vh-64px)] flex-col bg-[#1a1a2e] animate-pulse">
            {/* Top Bar Skeleton */}
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#ffffff0f] px-4">
                <div className="h-4 w-24 rounded bg-[#ffffff14]" />
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-[#ffffff14]" />
                    <div className="h-3 w-12 rounded bg-[#ffffff14]" />
                    <div className="h-7 w-7 rounded bg-[#ffffff14]" />
                </div>
            </div>

            {/* Split Panels */}
            <div className="flex flex-1 min-h-0">
                {/* Left Panel Skeleton */}
                <div className="flex w-1/2 flex-col border-r border-[#ffffff0f]">
                    <div className="flex shrink-0 items-center gap-1 border-b border-[#ffffff0f] px-4 py-0 h-[41px]">
                        <div className="h-4 w-24 rounded bg-[#ffffff14] mt-2" />
                        <div className="h-4 w-24 rounded bg-[#ffffff0a] mt-2 ml-4" />
                    </div>
                    
                    <div className="flex-1 p-6 space-y-6">
                        <div className="space-y-3">
                            <div className="h-6 w-3/4 rounded bg-[#ffffff14]" />
                            <div className="h-4 w-16 rounded bg-[#ffffff14]" />
                        </div>
                        
                        <div className="space-y-3 pt-4">
                            <div className="h-3 w-full rounded bg-[#ffffff0a]" />
                            <div className="h-3 w-full rounded bg-[#ffffff0a]" />
                            <div className="h-3 w-5/6 rounded bg-[#ffffff0a]" />
                        </div>

                        <div className="space-y-3 pt-4 border-t border-[#ffffff0f]">
                            <div className="h-4 w-32 rounded bg-[#ffffff0a]" />
                            <div className="h-4 w-40 rounded bg-[#ffffff0a]" />
                        </div>
                    </div>
                </div>

                {/* Right Panel Skeleton */}
                <div className="flex flex-col w-1/2">
                    <div className="flex shrink-0 items-center border-b border-[#ffffff0f] px-4 h-[41px]">
                        <div className="h-4 w-24 rounded bg-[#ffffff14] mt-2" />
                    </div>
                    
                    <div className="flex flex-1 flex-col items-center justify-center px-8">
                        <div className="mb-4 h-14 w-14 rounded-2xl bg-[#ffffff0a]" />
                        <div className="mb-2 h-4 w-40 rounded bg-[#ffffff14]" />
                        <div className="mb-6 h-3 w-64 rounded bg-[#ffffff0a]" />
                        <div className="h-9 w-32 rounded-lg bg-[#05966955]" />
                    </div>

                    <div className="h-[140px] shrink-0 border-t border-[#ffffff0f]">
                        <div className="flex items-center gap-1 border-b border-[#ffffff0f] px-4 h-[37px]">
                            <div className="h-4 w-20 rounded bg-[#ffffff14] mt-2" />
                            <div className="h-4 w-20 rounded bg-[#ffffff0a] mt-2 ml-4" />
                        </div>
                        <div className="px-5 py-4">
                            <div className="h-9 w-24 rounded-lg bg-[#05966933]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
