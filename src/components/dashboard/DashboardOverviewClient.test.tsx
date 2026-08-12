// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardOverviewClient from "./DashboardOverviewClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => false,
  };
});

vi.mock("@/components/recordings/RecordingModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="recording-modal">Modal Open</div> : null,
}));

describe("DashboardOverviewClient", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const mockStats = [
    { iconKey: "completed" as const, label: "Completed", value: "12", change: "+2" },
    { iconKey: "streak" as const, label: "Streak", value: "5", suffix: "d", change: "0" },
    { iconKey: "hours" as const, label: "Hours", value: "4.5", suffix: "h", change: "+1.2" },
    { iconKey: "average" as const, label: "Average", value: "84", suffix: "%", change: "+3%" },
  ];

  const mockSessions = [
    {
      id: "sess-1",
      role: "Frontend Engineer",
      company: "Stripe",
      type: "coding-algorithms",
      difficulty: "medium",
      score: 88,
      duration: "25m",
      date: "Jul 30, 2026",
      videoKey: "video-1.webm",
    },
  ];

  const defaultProps = {
    userId: "user-1",
    firstName: "Alex",
    isFirstLogin: false,
    stats: mockStats,
    recentSessions: mockSessions,
    topStrength: "Structured answers",
    topFocus: "Add more metrics",
  };

  it("renders greeting, scoreboard, and recent sessions", () => {
    render(<DashboardOverviewClient {...defaultProps} />);

    expect(screen.getByRole("heading", { name: /Welcome back,\s*Alex/i })).toBeDefined();
    expect(screen.getByText("Start Mock Interview")).toBeDefined();
    expect(screen.getByText("Browse questions")).toBeDefined();

    expect(screen.getByText("Last run")).toBeDefined();
    expect(screen.getAllByText("88").length).toBeGreaterThan(0);
    expect(screen.getByText("Frontend Engineer at Stripe")).toBeDefined();
    expect(screen.getByText("Completed")).toBeDefined();
    expect(screen.getByText("Streak")).toBeDefined();
    expect(screen.getByText("Score path")).toBeDefined();
    expect(screen.getByText("Full analytics →")).toBeDefined();

    expect(screen.getByText("Recent sessions")).toBeDefined();
    expect(screen.getByText("Frontend Engineer")).toBeDefined();
    expect(screen.getByText("Coding / algorithms")).toBeDefined();
    expect(screen.getByText("Medium")).toBeDefined();
    expect(screen.getByText("Stripe")).toBeDefined();
    expect(screen.getByText(/Jul 30, 2026 · 25m/)).toBeDefined();

    expect(screen.getByText("Recommendations")).toBeDefined();
    expect(screen.getByText("Focus next")).toBeDefined();
    expect(screen.getByText("Add more metrics")).toBeDefined();
    expect(screen.getByText("Keep leaning on")).toBeDefined();
    expect(screen.getByText("Structured answers")).toBeDefined();
    expect(screen.queryByText("Mix by interview kind")).toBeNull();
  });

  it("renders empty state when no sessions exist", () => {
    render(
      <DashboardOverviewClient
        {...defaultProps}
        stats={[]}
        recentSessions={[]}
        topStrength={null}
        topFocus={null}
      />,
    );

    expect(screen.getByText("No sessions recorded yet")).toBeDefined();
    expect(screen.getByText("Start an interview now")).toBeDefined();
    expect(screen.queryByText("Score path")).toBeNull();
    expect(screen.queryByText("Last run")).toBeNull();
    expect(screen.queryByText("Recommendations")).toBeNull();
  });

  it("hides recommendations when evaluation insights are missing", () => {
    render(
      <DashboardOverviewClient
        {...defaultProps}
        topStrength={null}
        topFocus={null}
      />,
    );

    expect(screen.queryByText("Recommendations")).toBeNull();
    expect(screen.getByText("Recent sessions")).toBeDefined();
  });

  it("shows welcome modal on first login", async () => {
    render(
      <DashboardOverviewClient
        {...defaultProps}
        userId="user-2"
        firstName="Jordan"
        isFirstLogin={true}
        stats={[]}
        recentSessions={[]}
        topStrength={null}
        topFocus={null}
      />,
    );

    expect(await screen.findByText("Welcome, Jordan")).toBeDefined();
    expect(screen.getByText("Getting started")).toBeDefined();
    expect(screen.getByText("Upload your resume")).toBeDefined();
    expect(screen.getByText("Explore question bank")).toBeDefined();
    expect(screen.getByText("Explore coding concepts")).toBeDefined();
    expect(screen.getByText("Read-only JavaScript previews and public samples")).toBeDefined();
    expect(screen.queryByText("Editor, test cases, and solutions")).toBeNull();
    expect(screen.getByText("Start your first interview")).toBeDefined();
  });
});
