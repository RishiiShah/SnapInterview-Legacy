"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Notification } from "@/data/types";
import {
  AnimatedBellIcon,
  AnimatedSearchIcon,
} from "@/components/ui/animated-icons";
import { IconMenu, IconPractice } from "@/components/ui/icons";
import { navItems } from "./Sidebar";

function NotificationPanel({
  open,
  notifications,
  loading,
  onMarkAllRead,
}: {
  open: boolean;
  notifications: Notification[];
  loading: boolean;
  onMarkAllRead: () => void;
}) {
  const unreadCount = notifications.filter((n) => !n.read).length;
  if (!open) return null;

  return (
    <div
      className="absolute right-0 top-12 w-80 rounded-xl border border-white/[0.08] bg-[#0C0F1A] shadow-xl"
      style={{ animation: "fadeSlideIn 0.15s ease-out" }}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="cursor-pointer text-xs font-medium text-[#B4C0D0] hover:text-[#CBD5E1]"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-80 divide-y divide-white/[0.06] overflow-y-auto">
        {loading ? (
          <div className="space-y-0 divide-y divide-white/[0.06]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-3.5 w-32 animate-pulse rounded bg-white/[0.06]" />
                <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-white/[0.06]" />
                <div className="mt-1.5 h-2.5 w-16 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[#B8C0CE]">No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 transition-colors hover:bg-white/[0.04] ${!n.read ? "bg-blue-500/[0.08]" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-[#CBD5E1]">{n.title}</p>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-[#B4C0D0]">{n.message}</p>
              <p className="mt-1 text-[10px] text-[#B0B8C8]">{n.time}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HeaderNotifButton({
  handleNotifOpen,
  unreadCount,
}: {
  handleNotifOpen: () => void;
  unreadCount: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={handleNotifOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative cursor-pointer rounded-xl p-2 text-[#B4C0D0] transition-colors hover:bg-white/[0.06] hover:text-[#CBD5E1]"
      aria-label="Notifications"
    >
      <AnimatedBellIcon className="icon-crisp h-5 w-5" strokeWidth={2.25} isHovered={isHovered} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

function HeaderSearchButton({ onSearchOpen }: { onSearchOpen: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onSearchOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="hidden cursor-pointer items-center gap-2 rounded-md border border-white/[0.1] bg-white/[0.02] px-2.5 py-1.5 text-sm text-[#A8B0C2] transition-colors hover:border-white/[0.16] hover:bg-white/[0.04] hover:text-[#C5CBD8] sm:flex"
    >
      <AnimatedSearchIcon className="icon-crisp h-[18px] w-[18px]" strokeWidth={2.25} isHovered={isHovered} />
      <span>Search…</span>
      <kbd className="ml-4 rounded border border-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[#B8C0CE]">
        ⌘K
      </kbd>
    </button>
  );
}

export function Header({
  onSearchOpen,
  onSidebarToggle,
}: {
  onSearchOpen: () => void;
  onSidebarToggle?: () => void;
}) {
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifFetched, setNotifFetched] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (notifFetched) return;
    setNotifLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = (await res.json()) as { notifications: Notification[] };
        setNotifications(data.notifications);
        setNotifFetched(true);
      }
    } catch {
      // empty
    } finally {
      setNotifLoading(false);
    }
  }, [notifFetched]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // optimistic
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNotifOpen = useCallback(() => {
    setNotifOpen((prev) => !prev);
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const pageTitle =
    pathname === "/dashboard"
      ? "Overview"
      : (navItems.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.label ??
        (pathname.startsWith("/settings") ? "Settings" : "Workspace"));

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0C0E14]/55 px-4 backdrop-blur-md sm:px-6 lg:px-10 xl:px-14 2xl:px-20">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {onSidebarToggle ? (
          <button
            type="button"
            onClick={onSidebarToggle}
            className="-ml-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#A8B0C2] transition-colors hover:bg-white/[0.05] hover:text-[#E8ECF4] md:hidden"
            aria-label="Open sidebar menu"
          >
            <IconMenu className="h-5 w-5" strokeWidth={2.15} />
          </button>
        ) : null}
        <h2 className="truncate text-sm font-medium tracking-tight text-[#C5CBD8]">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <HeaderSearchButton onSearchOpen={onSearchOpen} />

        <button
          type="button"
          onClick={onSearchOpen}
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md border border-white/[0.1] text-[#A8B0C2] transition-colors hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-[#E8ECF4] sm:hidden"
          aria-label="Search"
        >
          <AnimatedSearchIcon className="icon-crisp h-[18px] w-[18px]" strokeWidth={2.25} isHovered={false} />
        </button>

        <div ref={notifRef} className="relative">
          <HeaderNotifButton handleNotifOpen={handleNotifOpen} unreadCount={unreadCount} />
          <NotificationPanel
            open={notifOpen}
            notifications={notifications}
            loading={notifLoading}
            onMarkAllRead={handleMarkAllRead}
          />
        </div>

        <Link
          href="/practice"
          className="ml-1 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-[#3B82F6] px-3 text-sm font-medium text-white transition-colors hover:bg-[#4B8FF7]"
        >
          <IconPractice className="h-4 w-4" />
          <span className="hidden sm:inline">Start Interview</span>
          <span className="sm:hidden">Start</span>
        </Link>
      </div>
    </header>
  );
}
