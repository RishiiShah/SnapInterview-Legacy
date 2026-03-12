"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { getInitials } from "@/utils/helpers";
import {
    IconArrowLeft,
    IconBookOpen,
    IconCamera,
    IconChartBars,
    IconChevronRight,
    IconChevronUp,
    IconDashboard,
    IconLogout,
    IconMicrophone,
    IconSettings,
} from "@/components/ui/icons";

export const navItems = [
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

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (v: boolean) => void }) {
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
                        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
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
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <Link key={item.href} href={item.href}
                            className={`group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"} ${collapsed ? "justify-center" : ""}`}>
                            {item.icon}
                            {!collapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
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
                            <button
                                onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
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
