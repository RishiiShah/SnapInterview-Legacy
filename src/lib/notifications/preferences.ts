import { z } from "zod/v4";

export type NotificationPrefs = {
  emailNotifs: boolean;
  practiceReminders: boolean;
  weeklyReport: boolean;
  scoreAlerts: boolean;
};

export const notificationPrefsInputSchema: z.ZodType<NotificationPrefs> = z.object({
  emailNotifs: z.boolean(),
  practiceReminders: z.boolean(),
  weeklyReport: z.boolean(),
  scoreAlerts: z.boolean(),
}).strict();

export const DEFAULT_NOTIFICATION_PREFS: Readonly<NotificationPrefs> = {
  emailNotifs: true,
  practiceReminders: true,
  weeklyReport: true,
  scoreAlerts: false,
};

export function normalizeNotificationPrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }

  const prefs = value as Record<string, unknown>;
  return {
    emailNotifs: typeof prefs.emailNotifs === "boolean" ? prefs.emailNotifs : DEFAULT_NOTIFICATION_PREFS.emailNotifs,
    practiceReminders: typeof prefs.practiceReminders === "boolean"
      ? prefs.practiceReminders
      : DEFAULT_NOTIFICATION_PREFS.practiceReminders,
    weeklyReport: typeof prefs.weeklyReport === "boolean" ? prefs.weeklyReport : DEFAULT_NOTIFICATION_PREFS.weeklyReport,
    scoreAlerts: typeof prefs.scoreAlerts === "boolean" ? prefs.scoreAlerts : DEFAULT_NOTIFICATION_PREFS.scoreAlerts,
  };
}
