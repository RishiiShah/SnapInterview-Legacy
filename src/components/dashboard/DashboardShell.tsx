"use client";

import { useState, useEffect, useRef, ReactNode, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useSidebar } from "@/app/providers";
import { getInitials } from "@/utils/helpers";
import { SEARCH_ITEMS, DEFAULT_NOTIFICATIONS } from "@/data/constants";
import { Notification } from "@/data/types";
import {
    IconArrowLeft,
    IconArrowRight,
    IconBell,
    IconBookOpen,
    IconCamera,
    IconChartBars,
    IconChevronRight,
    IconChevronUp,
    IconDashboard,
    IconLogout,
    IconMicrophone,
    IconSearch,
    IconSettings,
} from "@/components/ui/icons";

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

/* ═══════════════════════════════════════════════════
   NAV ITEMS (icons are JSX, so defined here)
   ═══════════════════════════════════════════════════ */
const navItems = [
    {
        label: "Dashboard", href: "/dashboard",
        icon: <IconDashboard className="h-5 w-5 shrink-0" />,
    },
    {
        label: "Practice", href: "/practice",
        icon: <IconMicrophone className="h-5 w-5 shrink-0" />,
    },
    {
        label: "Question Bank", href: "/questions",
        icon: <IconBookOpen className="h-5 w-5 shrink-0" />,
    },
    {
        label: "Analytics", href: "/analytics",
        icon: <IconChartBars className="h-5 w-5 shrink-0" />,
    },
    {
        label: "Recordings", href: "/recordings",
        icon: <IconCamera className="h-5 w-5 shrink-0" />,
    },
];

/* ═══════════════════════════════════════════════════
   SIDEBAR
   ═══════════════════════════════════════════════════ */
function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const userName = session?.user?.name || "User";
    const userEmail = session?.user?.email || "";
    const userImage = session?.user?.image;
    const initials = getInitials(userName);

    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);

    // Close drop-up on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <aside className={`fixed inset-y-0 left-0 z-60 flex ${collapsed ? "w-16" : "w-64"} flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out`}>
            {/* Logo + Toggle */}
            <div className={`flex h-16 items-center border-b border-zinc-100 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
                {collapsed ? (
                    <button onClick={() => setCollapsed(false)} className="group/logo relative grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 transition-colors hover:bg-zinc-700" aria-label="Open sidebar" title="Open sidebar">
                        <span className="text-[11px] font-bold leading-none tracking-tighter text-white transition-opacity group-hover/logo:opacity-0">SI</span>
                        <IconChevronRight className="absolute inset-0 m-auto h-4 w-4 text-white opacity-0 transition-opacity group-hover/logo:opacity-100" />
                    </button>
                ) : (
                    <>
                        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold leading-none tracking-tighter text-white">SI</div>
                            <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-zinc-900">SnapInterview</span>
                        </Link>
                        <button onClick={() => setCollapsed(true)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600" aria-label="Collapse sidebar">
                            <IconArrowLeft className="h-4 w-4" />
                        </button>
                    </>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-2 py-4">
                {navItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}
                            className={`group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"} ${collapsed ? "justify-center" : ""}`}>
                            {item.icon}
                            {!collapsed && <span>{item.label}</span>}
                            {collapsed && (
                                <span className="absolute left-full ml-4 hidden rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover/nav:block group-hover/nav:opacity-100 z-50 shadow-sm border border-zinc-800">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom: Account Card with Drop-up */}
            <div ref={accountRef} className="relative border-t border-zinc-100 px-2 py-3">
                {/* Account Button */}
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
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">{initials}</div>
                    )}
                    {!collapsed && (
                        <>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-900">{userName}</p>
                                <p className="truncate text-xs text-zinc-400">{userEmail}</p>
                            </div>
                            <IconChevronUp className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`} />
                        </>
                    )}
                </button>

                {/* Drop-up Menu */}
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
                            <Link href="/settings" onClick={() => setAccountOpen(false)}
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                                <IconSettings className="h-4 w-4 text-zinc-400" />
                                Settings
                            </Link>
                            <button onClick={() => signOut({ callbackUrl: "/login" })}
                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
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

/* ═══════════════════════════════════════════════════
   NOTIFICATION PANEL
   ═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   AVATAR DROPDOWN
   ═══════════════════════════════════════════════════ */
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
                <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                    <IconLogout className="h-4 w-4 text-zinc-400" />
                    Log out
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SEARCH MODAL
   ═══════════════════════════════════════════════════ */
function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    if (!open) return null;

    const filtered = SEARCH_ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));
    const grouped = filtered.reduce<Record<string, typeof SEARCH_ITEMS>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl" style={{ animation: "fadeSlideIn 0.15s ease-out" }}>
                <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3">
                    <IconSearch className="h-5 w-5 shrink-0 text-zinc-400" />
                    <input ref={inputRef} type="text" placeholder="Search pages and actions…" value={query} onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none" />
                    <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">ESC</kbd>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                    {Object.keys(grouped).length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-zinc-400">No results found</p>
                    ) : (
                        Object.entries(grouped).map(([cat, items]) => (
                            <div key={cat}>
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{cat}</p>
                                {items.map((item) => (
                                    <Link key={item.label} href={item.href} onClick={onClose}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                                        <IconArrowRight className="h-4 w-4 text-zinc-400" />
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════ */
function Header({ onSearchOpen }: { onSearchOpen: () => void }) {
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
        } catch {
            // Ignore localStorage failures.
        }
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

    const pageTitle = navItems.find((i) => i.href === pathname)?.label ?? "Dashboard";

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

/* ═══════════════════════════════════════════════════
   DASHBOARD SHELL
   ═══════════════════════════════════════════════════ */
export default function DashboardShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { data: session, status } = useSession();
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
        if (status !== "authenticated") {
            return;
        }

        if (!session?.user?.onboardingCompleted) {
            router.replace("/onboarding");
        }
    }, [router, session?.user?.onboardingCompleted, status]);

    useEffect(() => {
        if (status !== "authenticated") {
            return;
        }

        void fetch("/api/settings/security", { method: "POST" });
    }, [status]);

    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTo({ top: 0, behavior: "auto" });
            return;
        }
        window.scrollTo(0, 0);
    }, [pathname]);

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 font-(family-name:--font-geist-sans)">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div className={`${collapsed ? "ml-16" : "ml-64"} flex h-screen flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
                <Header onSearchOpen={() => setSearchOpen(true)} />
                <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto p-6 pb-2">{children}</main>
            </div>
            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
}
