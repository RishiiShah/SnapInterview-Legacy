"use client";

import { useState } from "react";
import { IconBell, IconChartBars, IconClock, IconEnvelope } from "@/components/ui/icons";

export type NotificationPrefs = {
  emailNotifs: boolean;
  practiceReminders: boolean;
  weeklyReport: boolean;
  scoreAlerts: boolean;
};

type NotificationsTabProps = {
  initialPrefs: NotificationPrefs;
};

export default function NotificationsTab({ initialPrefs }: NotificationsTabProps) {
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [isSavingKey, setIsSavingKey] = useState<keyof NotificationPrefs | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updatePreference = async (key: keyof NotificationPrefs, value: boolean) => {
    const previous = notificationPrefs;
    const next = { ...notificationPrefs, [key]: value };

    setSaveError(null);
    setIsSavingKey(key);
    setNotificationPrefs(next);

    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(typeof data?.error === "string" ? data.error : "Failed to update preferences.");
        setNotificationPrefs(previous);
      }
    } catch {
      setSaveError("Failed to update preferences.");
      setNotificationPrefs(previous);
    } finally {
      setIsSavingKey(null);
    }
  };

  const preferenceItems = [
    {
      label: "Email notifications",
      desc: "Receive updates about your account via email",
      key: "emailNotifs" as const,
      value: notificationPrefs.emailNotifs,
      icon: <IconEnvelope className="h-5 w-5" />,
    },
    {
      label: "Practice reminders",
      desc: "Get daily reminders to keep practicing",
      key: "practiceReminders" as const,
      value: notificationPrefs.practiceReminders,
      icon: <IconClock className="h-5 w-5" />,
    },
    {
      label: "Weekly report",
      desc: "Receive a weekly summary of your progress",
      key: "weeklyReport" as const,
      value: notificationPrefs.weeklyReport,
      icon: <IconChartBars className="h-5 w-5" />,
    },
    {
      label: "Score alerts",
      desc: "Get notified when you hit a new personal best",
      key: "scoreAlerts" as const,
      value: notificationPrefs.scoreAlerts,
      icon: <IconBell className="h-5 w-5" />,
    },
  ];

  return (
    <div>
      <div className="border-b border-zinc-100 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <h2 className="text-lg font-semibold text-zinc-900">Notification Preferences</h2>
        <p className="mt-1 text-sm text-zinc-600">Choose what notifications you want to receive.</p>
      </div>

      <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="space-y-2">
          {preferenceItems.map((pref) => (
            <div key={pref.label} className="flex flex-col items-start justify-between gap-3 rounded-xl border border-zinc-100 px-4 py-4 transition-all hover:border-zinc-200 hover:shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-5">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className={`shrink-0 ${pref.value ? "text-zinc-700" : "text-zinc-300"} transition-colors`}>{pref.icon}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{pref.label}</p>
                  <p className="text-xs text-zinc-600">{pref.desc}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  void updatePreference(pref.key, !pref.value);
                }}
                disabled={isSavingKey === pref.key}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${pref.value ? "bg-zinc-900" : "bg-zinc-200"}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${pref.value ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
        {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
      </div>
    </div>
  );
}
