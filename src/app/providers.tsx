"use client";

import { SessionProvider } from "next-auth/react";
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

// ─── SIDEBAR CONTEXT ─────────────────────────────────
interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}

function SidebarProvider({ children }: { children: ReactNode }) {
    // Keep first render deterministic for SSR hydration, then restore user preference.
    const [collapsed, setCollapsed] = useState(false);
    const hasLoadedPreference = useRef(false);

    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        hasLoadedPreference.current = true;

        if (saved === "true") {
            queueMicrotask(() => {
                setCollapsed(true);
            });
        }
    }, []);

    useEffect(() => {
        if (!hasLoadedPreference.current) {
            return;
        }
        localStorage.setItem("sidebar-collapsed", String(collapsed));
    }, [collapsed]);

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

// ─── MAIN PROVIDER ───────────────────────────────────
export default function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <SidebarProvider>{children}</SidebarProvider>
        </SessionProvider>
    );
}
