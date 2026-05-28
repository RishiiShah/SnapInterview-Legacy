"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AppLogo } from "@/components/ui/AppLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { getInitials } from "@/utils/helpers";
import { IconChevronUp } from "@/components/ui/icons";
import {
    AnimatedSidebarCollapseIcon,
    AnimatedLogoutIcon,
    AnimatedSettingsIcon,
    AnimatedDashboardIcon,
    AnimatedMessageSquareIcon,
    AnimatedLibraryIcon,
    AnimatedChartLineIcon,
    AnimatedSidebarOpenIcon,
    AnimatedVideoCameraIcon,
} from "@/components/ui/animated-icons";

type DashboardSession = {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
} | null;

type NavItem = {
    label: string;
    href: string;
    icon: React.ReactElement<{ isHovered?: boolean }>;
};

export const navItems: NavItem[] = [
    {
        label: "Dashboard", href: "/dashboard",
        icon: <AnimatedDashboardIcon className="h-5 w-5 shrink-0" strokeWidth={1.9} />,
    },
    {
        label: "Practice", href: "/practice",
        icon: <AnimatedMessageSquareIcon className="h-5 w-5 shrink-0" strokeWidth={1.9} />,
    },
    {
        label: "Question Bank", href: "/questions",
        icon: <AnimatedLibraryIcon className="h-5 w-5 shrink-0" strokeWidth={1.9} />,
    },
    {
        label: "Analytics", href: "/analytics",
        icon: <AnimatedChartLineIcon className="h-5 w-5 shrink-0" strokeWidth={1.9} />,
    },
    {
        label: "Recordings", href: "/recordings",
        icon: <AnimatedVideoCameraIcon className="h-5 w-5 shrink-0" strokeWidth={1.9} />,
    },
];

function SidebarNavItem({ item, active, collapsed }: { item: NavItem, active: boolean, collapsed: boolean }) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <Link 
            href={item.href}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group/nav relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"} ${collapsed ? "justify-center" : ""}`}
        >
            {React.cloneElement(item.icon, { isHovered })}
            {!collapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
            {collapsed && (
                <span className="absolute left-full ml-4 hidden rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover/nav:block group-hover/nav:opacity-100 z-50 shadow-sm border border-zinc-800">
                    {item.label}
                </span>
            )}
        </Link>
    );
}

function SidebarLogoutButton() {
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

function SidebarSettingsLink({ onClick }: { onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <Link 
            href="/settings" 
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
        >
            <AnimatedSettingsIcon className="h-4 w-4 text-zinc-400" isHovered={isHovered} />
            Settings
        </Link>
    );
}

export function Sidebar({
    collapsed,
    setCollapsed,
    session,
}: {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
    session: DashboardSession;
}) {
    const pathname = usePathname();
    const userName = session?.user?.name || "User";
    const userEmail = session?.user?.email || "";
    const userImage = session?.user?.image;
    const initials = getInitials(userName);
    const [isSidebarOpenHovered, setIsSidebarOpenHovered] = useState(false);
    const [isSidebarCollapseHovered, setIsSidebarCollapseHovered] = useState(false);

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
                    <button
                        onClick={() => setCollapsed(false)}
                        onMouseEnter={() => setIsSidebarOpenHovered(true)}
                        onMouseLeave={() => setIsSidebarOpenHovered(false)}
                        className="group/logo relative grid h-9 w-9 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-zinc-100"
                        aria-label="Open sidebar"
                        title="Open sidebar"
                    >
                        <AppLogo
                            size={36}
                            className="transition-opacity duration-150 group-hover/logo:opacity-0"
                        />
                        <AnimatedSidebarOpenIcon
                            className="absolute inset-0 m-auto h-5 w-5 text-zinc-900 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100"
                            strokeWidth={1.8}
                            isHovered={isSidebarOpenHovered}
                        />
                    </button>
                ) : (
                    <>
                        <Link href="/dashboard" className="flex items-center gap-1.5 overflow-hidden">
                            <AppLogo size={28} />
                            <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-zinc-900">SnapInterview</span>
                        </Link>
                        <button
                            onClick={() => setCollapsed(true)}
                            onMouseEnter={() => setIsSidebarCollapseHovered(true)}
                            onMouseLeave={() => setIsSidebarCollapseHovered(false)}
                            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                            aria-label="Collapse sidebar"
                            title="Collapse sidebar"
                        >
                            <AnimatedSidebarCollapseIcon className="h-5 w-5" strokeWidth={1.9} isHovered={isSidebarCollapseHovered} />
                        </button>
                    </>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-2 py-4">
                {navItems.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + '/');
                    return <SidebarNavItem key={item.href} item={item} active={active} collapsed={collapsed} />;
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
                            <UserAvatar src={userImage} alt={userName} fill sizes="28px" className="object-cover" />
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
                            <SidebarSettingsLink onClick={() => setAccountOpen(false)} />
                            <SidebarLogoutButton />
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
