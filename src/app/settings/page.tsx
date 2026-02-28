"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getInitials } from "@/utils/helpers";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import ProfileTab from "@/components/settings/ProfileTab";
import PasswordTab from "@/components/settings/PasswordTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import DangerZoneTab from "@/components/settings/DangerZoneTab";

const tabs = [
  {
    id: "profile" as const,
    label: "Profile",
    desc: "Personal information",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    id: "password" as const,
    label: "Password",
    desc: "Security settings",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    id: "notifications" as const,
    label: "Notifications",
    desc: "Email & alerts",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: "danger" as const,
    label: "Danger Zone",
    desc: "Delete account",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
];

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const userName = session?.user?.name || "";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const initials = getInitials(userName || "U");

  return (
    <DashboardShell>
      <div className="space-y-5 pb-8">
        <SlideIn>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage your account and preferences.</p>
          </div>
        </SlideIn>

        <FadeIn delay={0.1} direction="up">
          <div className="flex gap-6">
            <nav className="w-56 shrink-0">
              <div className="sticky top-6 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                      activeTab === tab.id
                        ? "bg-zinc-900 text-white shadow-sm"
                        : tab.id === "danger"
                          ? "text-red-600 hover:bg-red-50"
                          : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <span className={`shrink-0 ${activeTab === tab.id ? "text-white" : tab.id === "danger" ? "text-red-400" : "text-zinc-400"}`}>
                      {tab.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{tab.label}</p>
                      <p className={`text-[11px] leading-tight ${activeTab === tab.id ? "text-white/60" : tab.id === "danger" ? "text-red-400" : "text-zinc-400"}`}>
                        {tab.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </nav>

            <div className="flex-1 rounded-2xl border border-zinc-200 bg-white">
              {activeTab === "profile" && (
                <ProfileTab userName={userName} userEmail={userEmail} userImage={userImage} initials={initials} />
              )}
              {activeTab === "password" && <PasswordTab />}
              {activeTab === "notifications" && <NotificationsTab />}
              {activeTab === "danger" && <DangerZoneTab />}
            </div>
          </div>
        </FadeIn>
      </div>
    </DashboardShell>
  );
}
