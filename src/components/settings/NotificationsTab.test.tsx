// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotificationsTab from "./NotificationsTab";

describe("NotificationsTab", () => {
  it("disables preference writes until the authoritative preferences load", () => {
    render(
      <NotificationsTab
        initialPrefs={{
          emailNotifs: true,
          practiceReminders: true,
          weeklyReport: true,
          scoreAlerts: false,
        }}
        isLoaded={false}
      />,
    );

    for (const toggle of screen.getAllByRole("button")) {
      expect((toggle as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
