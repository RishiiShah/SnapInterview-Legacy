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

const PROFILE_IMAGE_STORAGE_KEY = "profile-image-override";

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
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-6 text-[15px] leading-relaxed text-[#E8ECF4] sm:px-6 lg:px-8 lg:pb-10 lg:pt-7 lg:text-base [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children}
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
    <div className="relative flex h-screen w-full overflow-hidden bg-[#0B0C10] font-sans text-[#F2F4F8] selection:bg-[#3B82F6] selection:text-white">
      {/* Single soft wash — no multi-orb glow stack */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(59,130,246,0.07), transparent 55%)",
        }}
      />

      <HoverSidebarProvider animate>
        <ShellLayout session={effectiveSession}>{children}</ShellLayout>
      </HoverSidebarProvider>
    </div>
  );
}
