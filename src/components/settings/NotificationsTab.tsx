"use client";

import { useState } from "react";

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
        setSaveError(
          typeof data?.error === "string" ? data.error : "Failed to update preferences.",
        );
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
    },
    {
      label: "Practice reminders",
      desc: "Get daily reminders to keep practicing",
      key: "practiceReminders" as const,
      value: notificationPrefs.practiceReminders,
    },
    {
      label: "Weekly report",
      desc: "Receive a weekly summary of your progress",
      key: "weeklyReport" as const,
      value: notificationPrefs.weeklyReport,
    },
    {
      label: "Score alerts",
      desc: "Get notified when you hit a new personal best",
      key: "scoreAlerts" as const,
      value: notificationPrefs.scoreAlerts,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl tracking-tight text-[#F2F4F8]">Notifications</h2>
        <p className="mt-1.5 text-sm text-[#A8B0C2]">Choose what notifications you want to receive.</p>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {preferenceItems.map((pref) => (
          <div
            key={pref.label}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#E8ECF4]">{pref.label}</p>
              <p className="mt-0.5 text-xs text-[#A8B0C2]">{pref.desc}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void updatePreference(pref.key, !pref.value);
              }}
              disabled={isSavingKey === pref.key}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                pref.value ? "bg-[#3B82F6]" : "bg-white/[0.12]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  pref.value ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
      {saveError && <p className="text-sm text-rose-400">{saveError}</p>}
    </div>
  );
}
