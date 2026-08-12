"use client";

import { useEffect, useRef, useState } from "react";
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

type SettingsBootstrapResource = "notifications" | "onboarding";

function getResourceForTab(activeTab: string): SettingsBootstrapResource | null {
  if (activeTab === "notifications") return "notifications";
  if (activeTab === "preferences") return "onboarding";
  return null;
}

export function useSettingsBootstrap(activeTab: string) {
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [onboardingPrefs, setOnboardingPrefs] = useState<OnboardingPreferencesFormValues>(DEFAULT_ONBOARDING_FORM_VALUES);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const loadedResourcesRef = useRef<Record<SettingsBootstrapResource, boolean>>({
    notifications: false,
    onboarding: false,
  });
  const requestRefs = useRef<Record<SettingsBootstrapResource, Promise<unknown> | null>>({
    notifications: null,
    onboarding: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const resource = getResourceForTab(activeTab);
    if (!resource || loadedResourcesRef.current[resource]) {
      return;
    }

    if (requestRefs.current[resource]) {
      return;
    }

    const request =
      resource === "notifications"
        ? fetch("/api/settings/notifications", { method: "GET" })
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null)
        : fetch("/api/onboarding", { method: "GET" })
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null);

    requestRefs.current[resource] = request;

    void request.then((data) => {
      if (!mountedRef.current) return;

      loadedResourcesRef.current[resource] = true;
      if (resource === "notifications") {
        setNotificationPrefs(normalizeNotificationPrefs((data as { notificationPrefs?: unknown } | null)?.notificationPrefs));
        setNotificationsLoaded(true);
        return;
      }

      if (data) {
        setOnboardingPrefs(normalizeOnboardingFormValues(data));
      }
      setOnboardingLoaded(true);
    }).finally(() => {
      if (requestRefs.current[resource] === request) {
        requestRefs.current[resource] = null;
      }
    });
  }, [activeTab]);

  return {
    notificationPrefs,
    onboardingPrefs,
    notificationsLoaded,
    onboardingLoaded,
  };
}
