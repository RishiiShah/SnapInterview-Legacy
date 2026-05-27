import Image from "next/image";

export default function LandingFooter() {
  return (
    <footer className="border-t border-zinc-100 bg-white py-12 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-1.5">
          <Image src="/logo.png" alt="SnapInterview Logo" width={28} height={28} className="rounded-md" />
          <span className="text-sm font-semibold tracking-tight">
            SnapInterview
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          © {new Date().getFullYear()} SnapInterview. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
