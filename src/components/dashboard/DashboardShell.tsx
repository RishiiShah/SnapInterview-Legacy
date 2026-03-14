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

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 font-sans">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} session={session} />
            <div className={`${collapsed ? "ml-16" : "ml-64"} flex h-screen flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
                <Header onSearchOpen={() => setSearchOpen(true)} session={session} />
                <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto p-6 pb-2">{children}</main>
            </div>
            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
}
