"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { getInitials } from "@/utils/helpers";
import ProfileTab from "@/components/settings/ProfileTab";
import SecurityTab from "@/components/settings/SecurityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import InterviewPreferencesTab from "@/components/settings/InterviewPreferencesTab";
import DangerZoneTab from "@/components/settings/DangerZoneTab";
import { useSettingsBootstrap } from "@/hooks/useSettingsBootstrap";
import type { OnboardingPreferencesFormValues } from "@/lib/onboarding/preferences";

const tabs = [
  { id: "profile" as const, label: "Profile", desc: "Personal information" },
  { id: "security" as const, label: "Security", desc: "Password & sessions" },
  { id: "preferences" as const, label: "Interview", desc: "Targets & defaults" },
  { id: "notifications" as const, label: "Notifications", desc: "Email & alerts" },
  { id: "danger" as const, label: "Danger zone", desc: "Delete account" },
];

type TabId = (typeof tabs)[number]["id"];

type SettingsPageClientProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  initialResumeText: string | null;
  initialOnboardingPrefs?: Partial<OnboardingPreferencesFormValues> | null;
};

export default function SettingsPageClient({
  user,
  initialResumeText,
  initialOnboardingPrefs,
}: SettingsPageClientProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const initialTab = tabParam && tabs.some((tab) => tab.id === tabParam) ? tabParam : "profile";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const { notificationPrefs, onboardingPrefs, notificationsLoaded, onboardingLoaded } =
    useSettingsBootstrap(activeTab, initialOnboardingPrefs);
  const initials = getInitials(user.name || "U");

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 pt-2 xl:max-w-[88rem]">
      <div>
        <div>
          <h1 className="font-display text-[2rem] leading-[1.15] tracking-[-0.02em] text-[#F2F4F8] sm:text-[2.35rem]">
            Settings
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#A8B0C2]">
            Manage your account and preferences.
          </p>
        </div>
      </div>

      <div>
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
                userName={user.name}
                userEmail={user.email}
                userImage={user.image}
                initials={initials}
                initialResumeText={initialResumeText}
              />
            )}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "preferences" && (
              <InterviewPreferencesTab
                key={onboardingLoaded ? "loaded" : "loading"}
                initialValues={onboardingPrefs}
                isLoaded={onboardingLoaded}
              />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab
                key={notificationsLoaded ? "loaded" : "loading"}
                initialPrefs={notificationPrefs}
                isLoaded={notificationsLoaded}
              />
            )}
            {activeTab === "danger" && <DangerZoneTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
