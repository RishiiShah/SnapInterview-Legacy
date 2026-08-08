import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 pt-2 xl:max-w-[88rem] animate-pulse">
      <SlideIn>
        <div className="space-y-3">
          <div className="h-9 w-36 rounded bg-white/[0.06]" />
          <div className="h-4 w-64 max-w-full rounded bg-white/[0.04]" />
        </div>
      </SlideIn>

      <FadeIn delay={0.08} direction="up">
        <div className="mt-2 flex flex-col gap-10 lg:flex-row lg:gap-14">
          <nav className="w-full shrink-0 lg:w-48">
            <div className="flex gap-4 lg:flex-col lg:gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-1.5 py-2">
                  <div
                    className={`h-3.5 w-24 rounded ${i === 0 ? "bg-white/[0.1]" : "bg-white/[0.05]"}`}
                  />
                  <div className="hidden h-2.5 w-16 rounded bg-white/[0.03] lg:block" />
                </div>
              ))}
            </div>
          </nav>

          <div className="min-h-[400px] flex-1 space-y-8">
            <div className="space-y-2">
              <div className="h-6 w-28 rounded bg-white/[0.06]" />
              <div className="h-4 w-56 rounded bg-white/[0.04]" />
            </div>
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-white/[0.06]" />
              <div className="space-y-2">
                <div className="h-4 w-36 rounded bg-white/[0.06]" />
                <div className="h-3 w-44 rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-white/[0.05]" />
                <div className="h-9 w-full border-b border-white/[0.08]" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-white/[0.05]" />
                <div className="h-9 w-full border-b border-white/[0.08]" />
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
