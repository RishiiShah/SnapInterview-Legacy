"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { AppLogo } from "@/components/ui/AppLogo";
import { cn } from "@/lib/utils";
import {
  IconChartBars,
  IconCode,
  IconDashboard,
  IconHelp,
  IconMessage,
  IconQuestionBank,
  IconRecordings,
  IconSettings,
  IconWorkflow,
} from "@/components/ui/icons";
import {
  HoverSidebarBody,
  HoverSidebarLink,
  SidebarLabel,
  useHoverSidebar,
} from "@/components/ui/hover-sidebar";
import {
  AnimatedSidebarCollapseIcon,
  AnimatedSidebarOpenIcon,
} from "@/components/ui/animated-icons";

type DashboardSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
} | null;

export const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Practice", href: "/practice" },
  { label: "Question Bank", href: "/questions" },
  { label: "Coding", href: "/coding" },
  { label: "Interview Plans", href: "/plans" },
  { label: "Analytics", href: "/analytics" },
  { label: "Recordings", href: "/recordings" },
];

/** Fixed optical box so every Lucide glyph shares the same centerline. */
function NavIcon({ children }: { children: ReactElement<{ className?: string }> }) {
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center [&>svg]:h-[18px] [&>svg]:w-[18px]">
      {children}
    </span>
  );
}

const generalLinks = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <NavIcon>
        <IconDashboard />
      </NavIcon>
    ),
  },
  {
    label: "Practice",
    href: "/practice",
    icon: (
      <NavIcon>
        <IconMessage />
      </NavIcon>
    ),
  },
  {
    label: "Question Bank",
    href: "/questions",
    icon: (
      <NavIcon>
        <IconQuestionBank />
      </NavIcon>
    ),
  },
  {
    label: "Interview Plans",
    href: "/plans",
    icon: (
      <NavIcon>
        <IconWorkflow />
      </NavIcon>
    ),
  },
  {
    label: "Coding",
    href: "/coding",
    icon: (
      <NavIcon>
        <IconCode />
      </NavIcon>
    ),
  },
];

const performanceLinks = [
  {
    label: "Analytics",
    href: "/analytics",
    icon: (
      <NavIcon>
        <IconChartBars />
      </NavIcon>
    ),
  },
  {
    label: "Recordings",
    href: "/recordings",
    icon: (
      <NavIcon>
        <IconRecordings />
      </NavIcon>
    ),
  },
];

const bottomLinks = [
  {
    label: "Help & Support",
    href: "/support",
    icon: (
      <NavIcon>
        <IconHelp />
      </NavIcon>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <NavIcon>
        <IconSettings />
      </NavIcon>
    ),
  },
];

function BrandRow() {
  const { expanded, togglePinned, pinned } = useHoverSidebar();

  return (
    <div
      className={cn(
        "flex h-12 shrink-0 items-center justify-between",
        expanded ? "px-3" : "px-0 justify-center"
      )}
    >
      <Link
        href="/dashboard"
        className={cn(
          "flex h-8 items-center transition-opacity hover:opacity-90 min-w-0",
          expanded ? "gap-2.5" : "w-8 h-8 justify-center mx-auto"
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center">
          <AppLogo size={28} className="shrink-0 rounded-md" priority />
        </span>
        <SidebarLabel className="text-sm font-semibold tracking-tight text-white flex items-center leading-none">
          Snap<span className="text-blue-400">Interview</span>
        </SidebarLabel>
      </Link>

      {expanded ? (
        <button
          type="button"
          onClick={togglePinned}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#7D889B] transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
          title={pinned ? "Collapse sidebar" : "Pin sidebar"}
        >
          {pinned ? (
            <AnimatedSidebarCollapseIcon size={16} />
          ) : (
            <AnimatedSidebarOpenIcon size={16} />
          )}
        </button>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { expanded } = useHoverSidebar();
  if (!expanded) return null;
  return (
    <p className="mb-1.5 px-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#7D889B]">
      {children}
    </p>
  );
}

function SidebarContents() {
  const pathname = usePathname();
  const { expanded, setMobileOpen } = useHoverSidebar();
  const onNavigate = () => setMobileOpen(false);

  return (
    <div className="flex h-full flex-col justify-between">
      <BrandRow />

      <div className="flex min-h-0 flex-1 flex-col justify-between border-r border-white/[0.06] p-2.5 pt-1.5">
        <nav className={expanded ? "space-y-4" : "space-y-0.5"}>
          <div>
            <SectionLabel>General</SectionLabel>
            <div className="space-y-0.5">
              {generalLinks.map((link) => (
                <HoverSidebarLink
                  key={link.href}
                  link={link}
                  active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Performance</SectionLabel>
            <div className="space-y-0.5">
              {performanceLinks.map((link) => (
                <HoverSidebarLink
                  key={link.href}
                  link={link}
                  active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        </nav>

        <div className="pt-3 border-t border-white/[0.06] space-y-0.5">
          {bottomLinks.map((link) => (
            <HoverSidebarLink
              key={link.href}
              link={link}
              active={pathname === link.href}
              onClick={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ session }: { session?: DashboardSession }) {
  void session;
  return (
    <HoverSidebarBody>
      <SidebarContents />
    </HoverSidebarBody>
  );
}
