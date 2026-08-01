"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

import { getInitials } from "@/utils/helpers";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import ProfileTab from "@/components/settings/ProfileTab";
import SecurityTab from "@/components/settings/SecurityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import InterviewPreferencesTab from "@/components/settings/InterviewPreferencesTab";
import DangerZoneTab from "@/components/settings/DangerZoneTab";
import { useSettingsBootstrap } from "@/hooks/useSettingsBootstrap";

const tabs = [
  {
    id: "profile" as const,
    label: "Profile",
    desc: "Personal information",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    id: "security" as const,
    label: "Security",
    desc: "Password & sessions",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    id: "preferences" as const,
    label: "Interview Preferences",
    desc: "Targets & defaults",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3.172a.75.75 0 011.364 0l.854 1.744a.75.75 0 00.565.41l1.923.281a.75.75 0 01.416 1.278l-1.39 1.365a.75.75 0 00-.216.663l.328 1.907a.75.75 0 01-1.088.79L10.25 10.53a.75.75 0 00-.698 0L7.818 11.61a.75.75 0 01-1.088-.79l.327-1.907a.75.75 0 00-.216-.663l-1.39-1.365a.75.75 0 01.416-1.278l1.923-.281a.75.75 0 00.565-.41l.853-1.744zM4.5 15.75h15m-15 3h15" />
      </svg>
    ),
  },
  {
    id: "notifications" as const,
    label: "Notifications",
    desc: "Email & alerts",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: "danger" as const,
    label: "Danger Zone",
    desc: "Delete account",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
];

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const { notificationPrefs, onboardingPrefs } = useSettingsBootstrap();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  const userName = session?.user?.name || "";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;
  const initials = getInitials(userName || "U");

  if (isPending || !session) {
    return (
      <>
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-5 pb-8">
        <SlideIn>
          <div>
            <h1 className="font-display text-2xl tracking-tight text-[#F2F4F8] sm:text-[1.75rem]">
              Settings
            </h1>
            <p className="mt-1 text-sm text-[#A8B0C2]">Manage your account and preferences.</p>
          </div>
        </SlideIn>

        <FadeIn delay={0.1} direction="up">
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
            <nav className="w-full shrink-0 lg:w-56">
              <div className="space-y-1 overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] p-2 lg:sticky lg:top-6">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const isDanger = tab.id === "danger";
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all sm:px-4 sm:py-3 ${
                        isActive
                          ? isDanger
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-[#3B82F6]/15 text-[#93C5FD]"
                          : isDanger
                            ? "text-rose-400 hover:bg-rose-500/10"
                            : "text-[#C5CBD8] hover:bg-white/[0.04] hover:text-[#E8ECF4]"
                      }`}
                    >
                      <span
                        className={`shrink-0 ${
                          isActive
                            ? isDanger
                              ? "text-rose-300"
                              : "text-[#93C5FD]"
                            : isDanger
                              ? "text-rose-400"
                              : "text-[#A8B0C2]"
                        }`}
                      >
                        {tab.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-tight">{tab.label}</p>
                        <p
                          className={`hidden text-[11px] leading-tight sm:block ${
                            isActive
                              ? isDanger
                                ? "text-rose-300/70"
                                : "text-[#93C5FD]/70"
                              : isDanger
                                ? "text-rose-400/70"
                                : "text-[#A8B0C2]"
                          }`}
                        >
                          {tab.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              {activeTab === "profile" && (
                <ProfileTab userName={userName} userEmail={userEmail} userImage={userImage} initials={initials} />
              )}
              {activeTab === "security" && <SecurityTab />}
              {activeTab === "preferences" && <InterviewPreferencesTab initialValues={onboardingPrefs} />}
              {activeTab === "notifications" && <NotificationsTab initialPrefs={notificationPrefs} />}
              {activeTab === "danger" && <DangerZoneTab />}
            </div>
          </div>
        </FadeIn>
      </div>
    </>
  );
}
