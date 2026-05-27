"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useSidebar } from "@/app/providers";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SearchModal } from "./SearchModal";

export default function DashboardShell({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const { collapsed, setCollapsed } = useSidebar();
    const [searchOpen, setSearchOpen] = useState(false);
  const [sessionImageOverride, setSessionImageOverride] = useState<string | null>(null);
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

  useEffect(() => {
    const storedOverride = localStorage.getItem("profile-image-override");
    setSessionImageOverride(storedOverride || null);

    function syncProfileImage() {
      const next = localStorage.getItem("profile-image-override");
      setSessionImageOverride(next || null);
    }

    function handleProfileImageUpdated(event: Event) {
      const customEvent = event as CustomEvent<{ image?: string | null }>;
      if (typeof customEvent.detail?.image === "string" || customEvent.detail?.image === null) {
        setSessionImageOverride(customEvent.detail.image ?? null);
        return;
      }
      syncProfileImage();
    }

    window.addEventListener("profile-image-updated", handleProfileImageUpdated as EventListener);
    window.addEventListener("storage", syncProfileImage);
    return () => {
      window.removeEventListener("profile-image-updated", handleProfileImageUpdated as EventListener);
      window.removeEventListener("storage", syncProfileImage);
    };
  }, []);

  const effectiveSession = sessionImageOverride
    ? {
      ...session,
      user: session?.user ? { ...session.user, image: sessionImageOverride } : session?.user,
    }
    : session;

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 font-sans">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} session={effectiveSession} />
            <div className={`${collapsed ? "ml-16" : "ml-64"} flex h-screen flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
        <Header onSearchOpen={() => setSearchOpen(true)} session={effectiveSession} />
                <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto p-6 pb-2">{children}</main>
            </div>
            {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
        </div>
    );
}
