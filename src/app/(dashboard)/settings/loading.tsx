import { FadeIn, SlideIn } from "@/components/ui/motion";

export default function SettingsLoading() {
  return (
    <div className="w-full space-y-5 pb-8 animate-pulse">
      <SlideIn>
        <div className="space-y-3">
          <div className="h-8 w-32 rounded-lg bg-white/[0.06]" />
          <div className="h-4 w-64 max-w-full rounded-md bg-white/[0.04]" />
        </div>
      </SlideIn>

      <FadeIn delay={0.1} direction="up">
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:gap-6">
          <nav className="w-full shrink-0 lg:w-56">
            <div className="space-y-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 ${
                    i === 0 ? "bg-[#3B82F6]/15" : "bg-transparent"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-sm ${
                      i === 0 ? "bg-[#3B82F6]/40" : "bg-white/[0.06]"
                    }`}
                  />
                  <div className="space-y-2">
                    <div
                      className={`h-3 w-24 rounded ${
                        i === 0 ? "bg-[#3B82F6]/35" : "bg-white/[0.06]"
                      }`}
                    />
                    <div
                      className={`h-2 w-16 rounded ${
                        i === 0 ? "bg-[#3B82F6]/20" : "bg-white/[0.04]"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </nav>

          <div className="min-h-[500px] flex-1 space-y-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-48 rounded bg-white/[0.06]" />
                <div className="h-4 w-32 rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-white/[0.06]" />
                <div className="h-10 w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.03]" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-white/[0.06]" />
                <div className="h-10 w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.03]" />
              </div>
              <div className="mt-4 h-10 w-32 rounded-lg bg-[#3B82F6]/30" />
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
