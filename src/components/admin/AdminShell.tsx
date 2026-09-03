"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { adminInteractiveClass } from "./admin-styles";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

type AdminUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export default function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AdminUser;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasLoadedPreference = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    hasLoadedPreference.current = true;
    if (saved === "true") queueMicrotask(() => setCollapsed(true));
  }, []);

  useEffect(() => {
    if (hasLoadedPreference.current) {
      localStorage.setItem("sidebar-collapsed", String(collapsed));
    }
  }, [collapsed]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      className={cn(
        "internal-app-shell flex h-screen overflow-hidden bg-[#0B0C10] font-sans text-[#E8ECF4] [color-scheme:dark]",
        adminInteractiveClass,
      )}
    >
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} user={user} />
      <div
        className={`${collapsed ? "ml-16" : "ml-64"} flex h-screen flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out`}
      >
        <AdminHeader user={user} />
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto bg-[#0C0E14] p-6 pb-2">
          {children}
        </main>
      </div>
    </div>
  );
}
