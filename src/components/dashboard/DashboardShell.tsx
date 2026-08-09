"use client";

import { useState, useEffect, useRef, useSyncExternalStore, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SearchModal } from "./SearchModal";
import {
  HoverSidebarProvider,
  useHoverSidebar,
} from "@/components/ui/hover-sidebar";
import { cn } from "@/lib/utils";
import InterviewFinalizeSync from "@/components/dashboard/InterviewFinalizeSync";

const PROFILE_IMAGE_STORAGE_KEY = "profile-image-override";

/** Question detail / coding workspace is a full-bleed split (not the padded content column). */
function isFullscreenWorkspacePath(pathname: string) {
  return /^\/(questions|coding)\/[^/]+$/.test(pathname);
}

function getProfileImageOverride() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PROFILE_IMAGE_STORAGE_KEY) || null;
}

function subscribeToProfileImageOverride(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("profile-image-updated", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("profile-image-updated", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function ShellLayout({
  children,
  session,
}: {
  children: ReactNode;
  session: {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  } | null;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { setMobileOpen } = useHoverSidebar();
  const fullscreenWorkspace = isFullscreenWorkspacePath(pathname);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Sidebar session={session} />

      <div className="relative z-10 flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onSearchOpen={() => setSearchOpen(true)}
          onSidebarToggle={() => setMobileOpen(true)}
        />
        <main
          ref={mainRef}
          className={cn(
            "dashboard-main min-h-0 flex-1 text-[15px] leading-relaxed text-[#E8ECF4] lg:text-[16px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            fullscreenWorkspace
              ? "overflow-hidden p-0"
              : "overflow-y-auto px-4 pb-8 pt-6 sm:px-5 lg:px-6 lg:pb-12 lg:pt-8",
          )}
        >
          <div
            className={cn(
              fullscreenWorkspace ? "h-full w-full" : "mx-auto w-full max-w-[88rem]",
            )}
          >
            {!fullscreenWorkspace ? <InterviewFinalizeSync /> : null}
            {children}
          </div>
        </main>
      </div>

      {searchOpen ? <SearchModal onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  const sessionImageOverride = useSyncExternalStore(
    subscribeToProfileImageOverride,
    getProfileImageOverride,
    () => null,
  );

  const effectiveSession = sessionImageOverride
    ? {
        ...session,
        user: session?.user
          ? { ...session.user, image: sessionImageOverride }
          : session?.user,
      }
    : session;

  return (
    <div className="internal-app-shell relative flex h-screen w-full overflow-hidden bg-[#0C0E14] font-sans text-[#F2F4F8] antialiased selection:bg-[#3B82F6] selection:text-white">
      {/* Room light: readable depth, still calm */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: [
              "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(70,90,130,0.18), transparent 58%)",
              "radial-gradient(ellipse 55% 45% at 8% 20%, rgba(59,130,246,0.14), transparent 62%)",
              "radial-gradient(ellipse 45% 40% at 96% 75%, rgba(99,120,160,0.08), transparent 60%)",
              "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.22) 100%)",
            ].join(", "),
          }}
        />
        {/* Soft stage pool behind content */}
        <div
          className="absolute left-1/2 top-[18%] h-[55%] w-[min(52rem,80%)] -translate-x-1/2 rounded-[50%]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(59,130,246,0.06), transparent 70%)",
          }}
        />
        <div className="dashboard-grain absolute inset-0 opacity-[0.07]" />
      </div>

      <HoverSidebarProvider animate>
        <ShellLayout session={effectiveSession}>{children}</ShellLayout>
      </HoverSidebarProvider>
    </div>
  );
}
