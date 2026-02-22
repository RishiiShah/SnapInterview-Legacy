"use client";

import { SessionProvider } from "next-auth/react";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
    // Default to false on first render to match SSR, avoiding hydration mismatch
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved === "true") setCollapsed(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("sidebar-collapsed", String(collapsed));
        }
    }, [collapsed, mounted]);

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
