"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Notification } from "@/data/types";
import {
  AnimatedBellIcon,
  AnimatedSearchIcon,
} from "@/components/ui/animated-icons";
import { useSession, signOut } from "@/lib/auth-client";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getInitials } from "@/utils/helpers";
import {
  IconMenu,
  IconSettings,
  IconUser,
  IconLogout,
  IconChevronDown,
} from "@/components/ui/icons";
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
      className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-white/[0.08] bg-[#0C0F1A] shadow-xl"
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
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[#A8B0C2]">
            No notifications right now.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 transition-colors ${
                !n.read ? "bg-blue-500/[0.06]" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-[#F2F4F8]">{n.title}</p>
                <span className="shrink-0 text-[10px] text-[#7D889B]">{n.time}</span>
              </div>
              <p className="mt-0.5 text-xs text-[#A8B0C2]">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
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
      className="hidden h-8 cursor-pointer items-center gap-2.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-[#A8B0C2] transition-colors hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-[#E8ECF4] sm:flex"
      aria-label="Search"
    >
      <AnimatedSearchIcon className="icon-crisp h-[18px] w-[18px]" strokeWidth={2.25} isHovered={isHovered} />
      <span className="text-xs font-medium">Search...</span>
      <kbd className="pointer-events-none rounded border border-white/[0.12] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-[#A8B0C2]">
        ⌘K
      </kbd>
    </button>
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
      className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03] text-[#A8B0C2] transition-colors hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-[#E8ECF4]"
      aria-label="Notifications"
    >
      <AnimatedBellIcon className="icon-crisp h-[18px] w-[18px]" strokeWidth={2.25} isHovered={isHovered} />
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-[#0C0E14]" />
      )}
    </button>
  );
}

function HeaderUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const userName = session?.user?.name || "Profile";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const initials = getInitials(userName);

  return (
    <div ref={dropdownRef} className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] pl-1 pr-2.5 transition-colors hover:border-white/[0.18] hover:bg-white/[0.08]"
        aria-label="User profile menu"
      >
        {userImage ? (
          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full">
            <UserAvatar src={userImage} alt={userName} fill sizes="24px" className="object-cover" />
          </div>
        ) : (
          <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#3B82F6] text-[10px] font-bold text-white">
            {initials}
          </div>
        )}
        <span className="hidden max-w-[110px] truncate text-xs font-medium text-[#E8ECF4] sm:inline">
          {userName}
        </span>
        <IconChevronDown className="h-3.5 w-3.5 text-[#A8B0C2]" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-white/[0.08] bg-[#0C0F1A] p-1.5 shadow-xl"
          style={{ animation: "fadeSlideIn 0.15s ease-out" }}
        >
          <div className="border-b border-white/[0.08] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-[#F2F4F8]">{userName}</p>
            {userEmail ? (
              <p className="truncate text-xs text-[#A8B0C2]">{userEmail}</p>
            ) : null}
          </div>

          <div className="py-1">
            <Link
              href="/settings?tab=profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.06] hover:text-[#F2F4F8]"
            >
              <IconUser className="h-4 w-4 text-[#A8B0C2]" />
              Profile
            </Link>
            <Link
              href="/settings?tab=preferences"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#C5CBD8] transition-colors hover:bg-white/[0.06] hover:text-[#F2F4F8]"
            >
              <IconSettings className="h-4 w-4 text-[#A8B0C2]" />
              Settings
            </Link>
          </div>

          <div className="border-t border-white/[0.08] pt-1">
            <button
              type="button"
              onClick={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.replace("/");
                    },
                  },
                })
              }
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            >
              <IconLogout className="h-4 w-4 text-rose-400" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
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
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0C0E14] px-4 sm:px-5 lg:px-6">
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
        <h2 className="flex h-8 items-center truncate text-sm font-medium tracking-tight text-[#C5CBD8]">{pageTitle}</h2>
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

        <HeaderUserButton />
      </div>
    </header>
  );
}
