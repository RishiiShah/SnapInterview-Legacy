"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { getInitials } from "@/utils/helpers";
import { DEFAULT_NOTIFICATIONS } from "@/data/constants";
import { Notification } from "@/data/types";
import { IconBell, IconLogout, IconSearch, IconSettings } from "@/components/ui/icons";
import { navItems } from "./Sidebar";

function getNotificationStorageKey(email?: string | null): string {
    return `snapinterview.notifications.read.${(email || "anon").toLowerCase()}`;
}

function getReadNotificationIds(storageKey: string): Set<string> {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((value): value is string => typeof value === "string"));
    } catch {
        return new Set();
    }
}

function NotificationPanel({ open, notifications, onMarkAllRead }: { open: boolean; notifications: Notification[]; onMarkAllRead: () => void }) {
    const unreadCount = notifications.filter((n) => !n.read).length;
    if (!open) return null;

    return (
        <div className="absolute right-0 top-12 w-80 rounded-xl border border-zinc-200 bg-white shadow-xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
                {unreadCount > 0 && <button onClick={onMarkAllRead} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">Mark all read</button>}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
                {notifications.map((n) => (
                    <div key={n.id} className={`px-4 py-3 transition-colors hover:bg-zinc-50 ${!n.read ? "bg-blue-50/40" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{n.message}</p>
                        <p className="mt-1 text-[10px] text-zinc-400">{n.time}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AvatarDropdown({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { data: session } = useSession();
    const userName = session?.user?.name || "User";
    const userEmail = session?.user?.email || "";
    if (!open) return null;

    return (
        <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
            <div className="border-b border-zinc-100 px-4 py-3">
                <p className="text-sm font-medium text-zinc-900">{userName}</p>
                <p className="text-xs text-zinc-500">{userEmail}</p>
            </div>
            <div className="p-1">
                <Link href="/settings" onClick={onClose} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                    <IconSettings className="h-4 w-4 text-zinc-400" />
                    Settings
                </Link>
                <button onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                    <IconLogout className="h-4 w-4 text-zinc-400" />
                    Log out
                </button>
            </div>
        </div>
    );
}

export function Header({ onSearchOpen }: { onSearchOpen: () => void }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userName = session?.user?.name || "User";
    const userEmail = session?.user?.email || null;
    const userImage = session?.user?.image;
    const initials = getInitials(userName);

    const [avatarOpen, setAvatarOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [, setNotificationRevision] = useState(0);

    const notificationStorageKey = useMemo(() => getNotificationStorageKey(userEmail), [userEmail]);

    const persistReadNotifications = useCallback((readIds: string[]) => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(notificationStorageKey, JSON.stringify(readIds));
        } catch {}
    }, [notificationStorageKey]);

    const notifications: Notification[] = (() => {
        const readIds = getReadNotificationIds(notificationStorageKey);
        return DEFAULT_NOTIFICATIONS.map((notification) => ({
            ...notification,
            read: notification.read || readIds.has(String(notification.id)),
        }));
    })();

    const avatarRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const pageTitle = navItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label ?? "Dashboard";

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur-lg">
            <h2 className="text-sm font-semibold text-zinc-900">{pageTitle}</h2>
            <div className="flex items-center gap-3">
                {/* Search */}
                <button onClick={onSearchOpen} className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-300 hover:bg-zinc-100 sm:flex">
                    <IconSearch className="h-4 w-4" />
                    <span>Search…</span>
                    <kbd className="ml-6 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">⌘K</kbd>
                </button>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                    <button onClick={() => { setNotifOpen(!notifOpen); setAvatarOpen(false); }} className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
                        <IconBell className="h-5 w-5" />
                        {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unreadCount}</span>}
                    </button>
                    <NotificationPanel
                        open={notifOpen}
                        notifications={notifications}
                        onMarkAllRead={() => {
                            const nextReadIds = notifications.map((notification) => String(notification.id));
                            persistReadNotifications(nextReadIds);
                            setNotificationRevision((prev) => prev + 1);
                        }}
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
                    <AvatarDropdown open={avatarOpen} onClose={() => setAvatarOpen(false)} />
                </div>
            </div>
        </header>
    );
}
