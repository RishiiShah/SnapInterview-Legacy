"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getInitials } from "@/utils/helpers";
import { SEARCH_ITEMS, DEFAULT_NOTIFICATIONS } from "@/data/constants";
import { Notification } from "@/data/types";

/* ═══════════════════════════════════════════════════
   NAV ITEMS (icons are JSX, so defined here)
   ═══════════════════════════════════════════════════ */
const navItems = [
    {
        label: "Dashboard", href: "/dashboard",
        icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
    },
    {
        label: "Practice", href: "/practice",
        icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>,
    },
    {
        label: "Question Bank", href: "/questions",
        icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
    },
    {
        label: "Analytics", href: "/analytics",
        icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
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
        <aside className={`fixed inset-y-0 left-0 z-40 flex ${collapsed ? "w-16" : "w-64"} flex-col border-r border-zinc-200 bg-white transition-all duration-300 ease-in-out`}>
            {/* Logo + Toggle */}
            <div className={`flex h-16 items-center border-b border-zinc-100 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
                {collapsed ? (
                    <button onClick={() => setCollapsed(false)} className="group/logo relative grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 transition-colors hover:bg-zinc-700" aria-label="Open sidebar" title="Open sidebar">
                        <span className="text-[11px] font-bold leading-none tracking-tighter text-white transition-opacity group-hover/logo:opacity-0">SI</span>
                        <svg className="absolute inset-0 m-auto h-4 w-4 text-white opacity-0 transition-opacity group-hover/logo:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                ) : (
                    <>
                        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-900 text-[11px] font-bold leading-none tracking-tighter text-white">SI</div>
                            <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-zinc-900">SnapInterview</span>
                        </Link>
                        <button onClick={() => setCollapsed(true)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600" aria-label="Collapse sidebar">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
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
                                <span className="absolute left-full ml-4 hidden rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover/nav:block group-hover/nav:opacity-100">
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
                            <svg className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
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
                                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Settings
                            </Link>
                            <button onClick={() => signOut({ callbackUrl: "/login" })}
                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                                <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                </svg>
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
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100">
                    <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
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
        if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(""); }
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
                    <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
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
                                        <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                        </svg>
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
    const userImage = session?.user?.image;
    const initials = getInitials(userName);

    const [avatarOpen, setAvatarOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

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
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                    <span>Search…</span>
                    <kbd className="ml-6 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">⌘K</kbd>
                </button>

                {/* Notifications */}
                <div ref={notifRef} className="relative">
                    <button onClick={() => { setNotifOpen(!notifOpen); setAvatarOpen(false); }} className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                        {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unreadCount}</span>}
                    </button>
                    <NotificationPanel open={notifOpen} notifications={notifications} onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))} />
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
    const [collapsed, setCollapsed] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    // Persist sidebar state
    useEffect(() => {
        const saved = localStorage.getItem("sidebar-collapsed");
        if (saved === "true") setCollapsed(true);
    }, []);
    useEffect(() => { localStorage.setItem("sidebar-collapsed", String(collapsed)); }, [collapsed]);

    // ⌘K shortcut
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
            if (e.key === "Escape") setSearchOpen(false);
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <div className="flex min-h-screen bg-zinc-50 font-[family-name:var(--font-geist-sans)]">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <div className={`${collapsed ? "ml-16" : "ml-64"} flex flex-1 flex-col transition-all duration-300 ease-in-out`}>
                <Header onSearchOpen={() => setSearchOpen(true)} />
                <main className="flex-1 p-8">{children}</main>
            </div>
            <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
}
