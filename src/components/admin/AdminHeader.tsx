"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { getInitials } from "@/utils/helpers";
import { IconLogout, IconSettings } from "@/components/ui/icons";
import { getAdminPageTitle } from "./admin-nav";

type AdminUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

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
    <div
      className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
      style={{ animation: "fadeSlideIn 0.15s ease-out" }}
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <p className="text-sm font-medium text-zinc-900">{userName}</p>
        <p className="text-xs text-zinc-500">{userEmail}</p>
      </div>
      <div className="p-1">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          <IconSettings className="h-4 w-4 text-zinc-400" />
          Settings
        </Link>
        <button
          onClick={() =>
            signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/login";
                },
              },
            })
          }
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          <IconLogout className="h-4 w-4 text-zinc-400" />
          Log out
        </button>
      </div>
    </div>
  );
}

export function AdminHeader({ user }: { user: AdminUser }) {
  const pathname = usePathname();
  const userName = user.name || "Admin";
  const userEmail = user.email || "";
  const userImage = user.image;
  const initials = getInitials(userName);
  const pageTitle = getAdminPageTitle(pathname);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/80 px-8 backdrop-blur-lg">
      <h2 className="text-sm font-semibold text-zinc-900">{pageTitle}</h2>
      <div ref={avatarRef} className="relative">
        <button
          onClick={() => setAvatarOpen(!avatarOpen)}
          className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-zinc-200"
        >
          {userImage ? (
            <UserAvatar src={userImage} alt={userName} fill sizes="32px" className="object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center bg-zinc-900 text-xs font-bold text-white">
              {initials}
            </div>
          )}
        </button>
        <AvatarDropdown
          open={avatarOpen}
          onClose={() => setAvatarOpen(false)}
          userName={userName}
          userEmail={userEmail}
        />
      </div>
    </header>
  );
}
