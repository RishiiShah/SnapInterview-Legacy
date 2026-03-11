"use client";

import { useEffect, useState } from "react";
import type { NotificationPrefs } from "@/components/settings/NotificationsTab";
import {
  DEFAULT_ONBOARDING_FORM_VALUES,
  normalizeOnboardingFormValues,
  type OnboardingPreferencesFormValues,
} from "@/lib/onboarding/preferences";

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailNotifs: true,
  practiceReminders: true,
  weeklyReport: true,
  scoreAlerts: false,
};

function normalizeNotificationPrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== "object") return DEFAULT_NOTIFICATION_PREFS;

  const prefs = value as Partial<NotificationPrefs>;
  if (
    typeof prefs.emailNotifs !== "boolean" ||
    typeof prefs.practiceReminders !== "boolean" ||
    typeof prefs.weeklyReport !== "boolean" ||
    typeof prefs.scoreAlerts !== "boolean"
  ) {
    return DEFAULT_NOTIFICATION_PREFS;
  }

  return {
    emailNotifs: prefs.emailNotifs,
    practiceReminders: prefs.practiceReminders,
    weeklyReport: prefs.weeklyReport,
    scoreAlerts: prefs.scoreAlerts,
  };
}

export function useSettingsBootstrap() {
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [onboardingPrefs, setOnboardingPrefs] = useState<OnboardingPreferencesFormValues>(DEFAULT_ONBOARDING_FORM_VALUES);

  useEffect(() => {
    let isCancelled = false;

    const loadSettingsData = async () => {
      try {
        const [notificationsRes, onboardingRes] = await Promise.all([
          fetch("/api/settings/notifications", { method: "GET" }),
          fetch("/api/onboarding", { method: "GET" }),
        ]);

        if (isCancelled) return;

        const notificationData = notificationsRes.ok ? await notificationsRes.json() : null;
        if (!isCancelled) {
          setNotificationPrefs(normalizeNotificationPrefs(notificationData?.notificationPrefs));
        }

        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json();
          if (!isCancelled) {
            setOnboardingPrefs(normalizeOnboardingFormValues(onboardingData));
          }
        }
      } catch {
        // Keep defaults when bootstrap fetch fails.
      }
    };

    void loadSettingsData();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    notificationPrefs,
    onboardingPrefs,
  };
}
