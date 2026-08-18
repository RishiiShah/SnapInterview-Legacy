import { describe, expect, it } from "vitest";
import { normalizeNotificationPrefs } from "./preferences";

describe("normalizeNotificationPrefs", () => {
  it("preserves explicit false values in partial stored preferences", () => {
    expect(normalizeNotificationPrefs({ emailNotifs: false })).toEqual({
      emailNotifs: false,
      practiceReminders: true,
      weeklyReport: true,
      scoreAlerts: false,
    });
  });

  it("defaults only malformed fields", () => {
    expect(normalizeNotificationPrefs({
      emailNotifs: false,
      practiceReminders: "yes",
      weeklyReport: false,
      scoreAlerts: null,
    })).toEqual({
      emailNotifs: false,
      practiceReminders: true,
      weeklyReport: false,
      scoreAlerts: false,
    });
  });
});
