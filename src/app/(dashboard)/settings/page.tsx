"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";

import { getInitials } from "@/utils/helpers";
import { FadeIn, SlideIn } from "@/components/ui/motion";
import ProfileTab from "@/components/settings/ProfileTab";
import SecurityTab from "@/components/settings/SecurityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import InterviewPreferencesTab from "@/components/settings/InterviewPreferencesTab";
import DangerZoneTab from "@/components/settings/DangerZoneTab";
import { useSettingsBootstrap } from "@/hooks/useSettingsBootstrap";

const tabs = [
  { id: "profile" as const, label: "Profile", desc: "Personal information" },
  { id: "security" as const, label: "Security", desc: "Password & sessions" },
  { id: "preferences" as const, label: "Interview", desc: "Targets & defaults" },
  { id: "notifications" as const, label: "Notifications", desc: "Email & alerts" },
  { id: "danger" as const, label: "Danger zone", desc: "Delete account" },
];

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab = tabParam && tabs.some((t) => t.id === tabParam) ? tabParam : "profile";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const { notificationPrefs, onboardingPrefs, isLoaded } = useSettingsBootstrap();

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
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 pt-2 xl:max-w-[88rem]">
      <SlideIn>
        <div>
          <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em] text-[#F2F4F8] sm:text-[2.35rem]">
            Settings
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#A8B0C2]">
            Manage your account and preferences.
          </p>
        </div>
      </SlideIn>

      <FadeIn delay={0.08} direction="up">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
          <nav className="w-full shrink-0 lg:w-48">
            <div className="flex gap-1 overflow-x-auto lg:sticky lg:top-6 lg:flex-col lg:gap-0.5 lg:overflow-visible">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const isDanger = tab.id === "danger";
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`cursor-pointer whitespace-nowrap px-1 py-2.5 text-left transition-colors lg:w-full ${
                      isActive
                        ? isDanger
                          ? "text-rose-300"
                          : "text-[#E8ECF4]"
                        : isDanger
                          ? "text-rose-400/70 hover:text-rose-300"
                          : "text-[#A8B0C2] hover:text-[#C5CBD8]"
                    }`}
                  >
                    <p className="text-sm font-medium leading-tight">{tab.label}</p>
                    <p
                      className={`mt-0.5 hidden text-[11px] leading-tight lg:block ${
                        isActive
                          ? isDanger
                            ? "text-rose-300/60"
                            : "text-[#8B93A7]"
                          : "text-[#6B7385]"
                      }`}
                    >
                      {tab.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="min-w-0 flex-1">
            {activeTab === "profile" && (
              <ProfileTab
                userName={userName}
                userEmail={userEmail}
                userImage={userImage}
                initials={initials}
              />
            )}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "preferences" && (
              <InterviewPreferencesTab initialValues={onboardingPrefs} isLoaded={isLoaded} />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab initialPrefs={notificationPrefs} />
            )}
            {activeTab === "danger" && <DangerZoneTab />}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
