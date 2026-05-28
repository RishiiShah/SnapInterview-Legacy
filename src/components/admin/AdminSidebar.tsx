"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { getInitials } from "@/utils/helpers";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconLogout,
  IconSettings,
} from "@/components/ui/icons";
import { adminNavItems, isAdminNavActive } from "./admin-nav";

type AdminUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function AdminSidebar({
  collapsed,
  setCollapsed,
  user,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  user: AdminUser;
}) {
  const pathname = usePathname();
  const userName = user.name || "Admin";
  const userEmail = user.email || "";
  const userImage = user.image;
  const initials = getInitials(userName);

  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-60 flex ${collapsed ? "w-16" : "w-64"} flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out`}
    >
      <div
        className={`flex h-16 items-center border-b border-zinc-100 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="group/logo relative grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-zinc-900 transition-colors hover:bg-zinc-700"
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <span className="text-[11px] font-bold leading-none tracking-tighter text-white transition-opacity group-hover/logo:opacity-0">
              SI
            </span>
            <IconChevronRight className="absolute inset-0 m-auto h-4 w-4 text-white opacity-0 transition-opacity group-hover/logo:opacity-100" />
          </button>
        ) : (
          <>
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5 overflow-hidden">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold leading-none tracking-tighter text-white">
                SI
              </div>
              <div className="min-w-0">
                <span className="block truncate whitespace-nowrap text-lg font-semibold tracking-tight text-zinc-900">
                  SnapInterview
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  Admin
                </span>
              </div>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              aria-label="Collapse sidebar"
            >
              <IconChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {adminNavItems.map((item) => {
          const active = isAdminNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"} ${collapsed ? "justify-center" : ""}`}
            >
              {item.icon}
              {!collapsed && (
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
              )}
              {collapsed && (
                <span className="absolute left-full z-50 ml-4 hidden rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/nav:block group-hover/nav:opacity-100">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        <div className="!mt-4 border-t border-zinc-100 pt-4">
          <Link
            href="/dashboard"
            className={`group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 ${collapsed ? "justify-center" : ""}`}
          >
            <IconArrowLeft className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">Back to App</span>}
            {collapsed && (
              <span className="absolute left-full z-50 ml-4 hidden rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity group-hover/nav:block group-hover/nav:opacity-100">
                Back to App
              </span>
            )}
          </Link>
        </div>
      </nav>

      <div ref={accountRef} className="relative border-t border-zinc-100 px-2 py-3">
        <button
          onClick={() => setAccountOpen(!accountOpen)}
          title={collapsed ? userName : undefined}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-zinc-100 ${collapsed ? "justify-center" : ""}`}
        >
          {userImage ? (
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <Image src={userImage} alt={userName} fill sizes="28px" className="object-cover" />
            </div>
          ) : (
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
              {initials}
            </div>
          )}
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{userName}</p>
                <p className="truncate text-xs text-zinc-400">{userEmail}</p>
              </div>
              <IconChevronUp
                className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {accountOpen && (
          <div
            className={`absolute bottom-full mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl ${collapsed ? "left-2 w-48" : "left-2 right-2"}`}
            style={{ animation: "fadeSlideUp 0.15s ease-out" }}
          >
            {collapsed && (
              <div className="border-b border-zinc-100 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">{userName}</p>
                <p className="truncate text-xs text-zinc-400">{userEmail}</p>
              </div>
            )}
            <div className="p-1">
              <Link
                href="/settings"
                onClick={() => setAccountOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <IconSettings className="h-4 w-4 text-zinc-400" />
                Settings
              </Link>
              <button
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        window.location.href = "/login";
                      },
                    },
                  })
                }
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                <IconLogout className="h-4 w-4 text-zinc-400" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
