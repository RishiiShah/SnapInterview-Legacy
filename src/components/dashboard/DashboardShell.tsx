"use client";

import { useState, useEffect, useRef, useSyncExternalStore, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useSidebar } from "@/app/providers";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SearchModal } from "./SearchModal";

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

export default function DashboardShell({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const { collapsed, setCollapsed } = useSidebar();
    const [searchOpen, setSearchOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileSidebar, setMobileSidebar] = useState({ pathname: "", open: false });
    const mainRef = useRef<HTMLElement>(null);

    // ⌘K shortcut
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
            if (e.key === "Escape") setSearchOpen(false);
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Scroll restoration
    const pathname = usePathname();

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, behavior: "auto" });
            return;
        }
        window.scrollTo(0, 0);
    }, [pathname]);

  const sessionImageOverride = useSyncExternalStore(
    subscribeToProfileImageOverride,
    getProfileImageOverride,
    () => null,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");

    const syncIsMobile = () => {
      setIsMobile(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setMobileSidebar({ pathname: "", open: false });
      }
    };

    syncIsMobile();
    mediaQuery.addEventListener("change", syncIsMobile);
    return () => mediaQuery.removeEventListener("change", syncIsMobile);
  }, []);

  const mobileSidebarOpen = mobileSidebar.pathname === pathname && mobileSidebar.open;
  const effectiveSession = sessionImageOverride
    ? {
      ...session,
      user: session?.user ? { ...session.user, image: sessionImageOverride } : session?.user,
    }
    : session;

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 font-sans">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        session={effectiveSession}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebar({ pathname, open: false })}
      />
            <div className={`${isMobile ? "ml-0" : collapsed ? "ml-16" : "ml-64"} flex h-screen flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
        <Header
          onSearchOpen={() => setSearchOpen(true)}
          session={effectiveSession}
          onSidebarToggle={isMobile ? () => setMobileSidebar({ pathname, open: true }) : undefined}
        />
                <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto p-6 pb-2">{children}</main>
            </div>
            {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
        </div>
    );
}
