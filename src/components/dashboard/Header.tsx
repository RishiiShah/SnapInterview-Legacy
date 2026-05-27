"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { getInitials } from "@/utils/helpers";
import { Notification } from "@/data/types";
import { IconSearch } from "@/components/ui/icons";
import { AnimatedSettingsIcon, AnimatedBellIcon, AnimatedLogoutIcon, AnimatedSearchIcon } from "@/components/ui/animated-icons";
import { navItems } from "./Sidebar";

type DashboardSession = {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
} | null;

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
        <div className="absolute right-0 top-12 w-80 rounded-xl border border-zinc-200 bg-white shadow-xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
                {unreadCount > 0 && (
                    <button onClick={onMarkAllRead} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                        Mark all read
                    </button>
                )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
                {loading ? (
                    <div className="space-y-0 divide-y divide-zinc-50">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="px-4 py-3">
                                <div className="h-3.5 w-32 animate-pulse rounded bg-zinc-100" />
                                <div className="mt-1.5 h-3 w-48 animate-pulse rounded bg-zinc-100" />
                                <div className="mt-1.5 h-2.5 w-16 animate-pulse rounded bg-zinc-100" />
                            </div>
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-zinc-400">No notifications yet</p>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 transition-colors hover:bg-zinc-50 ${!n.read ? "bg-blue-50/40" : ""}`}>
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                            </div>
                            <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{n.message}</p>
                            <p className="mt-1 text-[10px] text-zinc-400">{n.time}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function SettingsLink({ onClose }: { onClose: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <Link 
            href="/settings" 
            onClick={onClose} 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
        >
            <AnimatedSettingsIcon className="h-4 w-4 text-zinc-400" isHovered={isHovered} />
            Settings
        </Link>
    );
}

function HeaderLogoutButton() {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <button 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })} 
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
        >
            <AnimatedLogoutIcon className="h-4 w-4 text-zinc-400" isHovered={isHovered} />
            Log out
        </button>
    );
}

function HeaderNotifButton({ handleNotifOpen, unreadCount }: { handleNotifOpen: () => void, unreadCount: number }) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <button
            onClick={handleNotifOpen}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
        >
            <AnimatedBellIcon className="h-5 w-5" isHovered={isHovered} />
            {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount}
                </span>
            )}
        </button>
    );
}

function HeaderSearchButton({ onSearchOpen }: { onSearchOpen: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <button 
            onClick={onSearchOpen} 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400 cursor-pointer transition-colors hover:border-zinc-300 hover:bg-zinc-100 sm:flex"
        >
            <AnimatedSearchIcon className="h-4 w-4" isHovered={isHovered} />
            <span>Search…</span>
            <kbd className="ml-6 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">⌘K</kbd>
        </button>
    );
}

function AvatarDropdown({
    open,
    onClose,
    userName,
    userEmail,
}: {
    open: boolean;
    onClose: () => void;
    userName: string;
    userEmail: string;
}) {
    if (!open) return null;

    return (
        <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
            <div className="border-b border-zinc-100 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">{userName}</p>
                <p className="text-xs text-zinc-500">{userEmail}</p>
            </div>
            <div className="p-1">
                <SettingsLink onClose={onClose} />
                <HeaderLogoutButton />
            </div>
        </div>
    );
}

export function Header({ onSearchOpen, session }: { onSearchOpen: () => void; session: DashboardSession }) {
    const pathname = usePathname();
    const userName = session?.user?.name || "User";
    const userEmail = session?.user?.email || null;
    const userImage = session?.user?.image;
    const initials = getInitials(userName);

    const [avatarOpen, setAvatarOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifFetched, setNotifFetched] = useState(false);

    const avatarRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        if (notifFetched) return;
        setNotifLoading(true);
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json() as { notifications: Notification[] };
                setNotifications(data.notifications);
                setNotifFetched(true);
            }
        } catch {
            // silently fail — panel will show empty state
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
            // optimistic update already applied
        }
    }, []);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleNotifOpen = useCallback(() => {
        setNotifOpen((prev) => !prev);
        setAvatarOpen(false);
        fetchNotifications();
    }, [fetchNotifications]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const pageTitle = navItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label ?? "Dashboard";

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur-lg">
            <h2 className="text-sm font-semibold text-zinc-900">{pageTitle}</h2>
            <div className="flex items-center gap-3">
                {/* Search */}
                <HeaderSearchButton onSearchOpen={onSearchOpen} />

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                    <HeaderNotifButton handleNotifOpen={handleNotifOpen} unreadCount={unreadCount} />
                    <NotificationPanel
                        open={notifOpen}
                        notifications={notifications}
                        loading={notifLoading}
                        onMarkAllRead={handleMarkAllRead}
                    />
                </div>

                {/* Avatar */}
                <div ref={avatarRef} className="relative">
                    <button onClick={() => { setAvatarOpen(!avatarOpen); setNotifOpen(false); }} className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-zinc-200">
                        {userImage ? (
                            <Image src={userImage} alt={userName} fill sizes="32px" className="object-cover" />
                        ) : (
                            <div className="grid h-full w-full place-items-center bg-zinc-900 text-xs font-bold text-white">{initials}</div>
                        )}
                    </button>
                    <AvatarDropdown
                        open={avatarOpen}
                        onClose={() => setAvatarOpen(false)}
                        userName={userName}
                        userEmail={userEmail || ""}
                    />
                </div>
            </div>
        </header>
    );
}
