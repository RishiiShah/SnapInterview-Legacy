"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { AppLogo } from "@/components/ui/AppLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  IconChartBars,
  IconCode,
  IconDashboard,
  IconLogout,
  IconMessage,
  IconQuestionBank,
  IconRecordings,
  IconSettings,
} from "@/components/ui/icons";
import { signOut } from "@/lib/auth-client";
import { getInitials } from "@/utils/helpers";
import {
  HoverSidebarBody,
  HoverSidebarLink,
  SidebarLabel,
  useHoverSidebar,
} from "@/components/ui/hover-sidebar";

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

const primaryLinks = [
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
    label: "Coding",
    href: "/coding",
    icon: (
      <NavIcon>
        <IconCode />
      </NavIcon>
    ),
  },
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

function BrandRow() {
  return (
    <Link
      href="/dashboard"
      className="flex h-10 items-center gap-2.5 px-2 transition-opacity hover:opacity-90"
    >
      <AppLogo size={28} className="-translate-y-0.5 shrink-0 rounded-md" priority />
      <SidebarLabel className="text-sm font-semibold tracking-tight text-[#F5F7FF]">
        Snap<span className="text-blue-400">Interview</span>
      </SidebarLabel>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const { expanded } = useHoverSidebar();
  if (!expanded) return <div className="h-2" />;
  return (
    <p className="mb-1.5 px-2.5 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-[#B8C0CE]">
      {children}
    </p>
  );
}

function UtilityLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="space-y-0.5 border-t border-white/[0.08] pt-3">
      <SectionLabel>Account</SectionLabel>
      <HoverSidebarLink
        link={{
          label: "Settings",
          href: "/settings",
          icon: (
            <NavIcon>
              <IconSettings />
            </NavIcon>
          ),
        }}
        active={pathname === "/settings" || pathname.startsWith("/settings/")}
        onClick={onNavigate}
      />
    </div>
  );
}

function AccountFooter({ session }: { session: DashboardSession }) {
  const { expanded } = useHoverSidebar();
  const router = useRouter();
  const userName = session?.user?.name || "User";
  const userImage = session?.user?.image;
  const initials = getInitials(userName);

  return (
    <div className="space-y-1 border-t border-white/[0.08] pt-3">
      <button
        type="button"
        onClick={() =>
          signOut({
            fetchOptions: {
              onSuccess: () => {
                router.push("/");
              },
            },
          })
        }
        className="group/sidebar flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-[#CBD5E1] transition-colors hover:bg-white/[0.04] hover:text-[#F2F4F8]"
      >
        <NavIcon>
          <IconLogout />
        </NavIcon>
        <SidebarLabel>Log out</SidebarLabel>
      </button>

      <div
        className={`flex items-center gap-2.5 px-2.5 py-2 ${
          expanded
            ? "rounded-xl border border-white/[0.06] bg-[#070910]"
            : "justify-center"
        }`}
      >
        {userImage ? (
          <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
            <UserAvatar src={userImage} alt={userName} fill sizes="28px" className="object-cover" />
          </div>
        ) : (
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
            {initials}
          </div>
        )}
        {expanded ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#CBD5E1]">{userName}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SidebarContents({ session }: { session: DashboardSession }) {
  const pathname = usePathname();
  const { setMobileOpen } = useHoverSidebar();
  const onNavigate = () => setMobileOpen(false);

  return (
    <div className="flex h-full flex-col justify-between gap-5">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <BrandRow />

        <div>
          <SectionLabel>Workspace</SectionLabel>
          <div className="flex flex-col gap-0.5">
            {primaryLinks.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <HoverSidebarLink
                  key={link.href}
                  link={link}
                  active={active}
                  onClick={onNavigate}
                />
              );
            })}
          </div>
        </div>

        <UtilityLinks onNavigate={onNavigate} />
      </div>

      <AccountFooter session={session} />
    </div>
  );
}

export function Sidebar({ session }: { session: DashboardSession }) {
  return (
    <HoverSidebarBody>
      <SidebarContents session={session} />
    </HoverSidebarBody>
  );
}
