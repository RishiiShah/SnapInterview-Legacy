// @vitest-environment jsdom

import { StrictMode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deferred } from "@/test-utils/deferred";
import { useSettingsBootstrap } from "./useSettingsBootstrap";

function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useSettingsBootstrap", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn((url: string | URL | Request) => {
      if (String(url) === "/api/settings/notifications") {
        return Promise.resolve(jsonResponse({
          notificationPrefs: {
            emailNotifs: false,
            practiceReminders: true,
            weeklyReport: false,
            scoreAlerts: true,
          },
        }));
      }

      if (String(url) === "/api/onboarding") {
        return Promise.resolve(jsonResponse({
          onboardingRole: "Software Engineer - Backend",
          onboardingCompany: "Acme",
          onboardingLevel: "senior",
          onboardingGoal: "new-role",
          preferredInterviewType: "system-design",
        }));
      }

      return Promise.resolve(jsonResponse({}));
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defers inactive settings resources until their tabs are selected and caches them", async () => {
    const { result, rerender } = renderHook(
      ({ activeTab }: { activeTab: string }) => useSettingsBootstrap(activeTab),
      { initialProps: { activeTab: "profile" } },
    );

    expect(fetch).not.toHaveBeenCalled();

    rerender({ activeTab: "notifications" });
    await waitFor(() => expect(result.current.notificationsLoaded).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/settings/notifications", { method: "GET" });
    expect(result.current.notificationPrefs.emailNotifs).toBe(false);

    rerender({ activeTab: "profile" });
    rerender({ activeTab: "notifications" });
    expect(fetch).toHaveBeenCalledTimes(1);

    rerender({ activeTab: "preferences" });
    await waitFor(() => expect(result.current.onboardingLoaded).toBe(true));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith("/api/onboarding", { method: "GET" });
    expect(result.current.onboardingPrefs.onboardingRole).toBe("Software Engineer - Backend");
  });

  it("applies a tab response after Strict Mode replays the mount lifecycle", async () => {
    const response = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(response.promise));

    const { result } = renderHook(
      () => useSettingsBootstrap("notifications"),
      { wrapper: ({ children }) => <StrictMode>{children}</StrictMode> },
    );

    response.resolve(jsonResponse({
      notificationPrefs: {
        emailNotifs: false,
        practiceReminders: true,
        weeklyReport: false,
        scoreAlerts: true,
      },
    }));

    await waitFor(() => expect(result.current.notificationsLoaded).toBe(true));
    expect(result.current.notificationPrefs.scoreAlerts).toBe(true);
  });
});
