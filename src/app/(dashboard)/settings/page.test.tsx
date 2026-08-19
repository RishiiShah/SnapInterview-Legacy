import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerAuthSession: vi.fn(),
  findUnique: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: mocks.getServerAuthSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import SettingsPage from "./page";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("server-hydrates authenticated profile and resume data", async () => {
    mocks.getServerAuthSession.mockResolvedValue({
      user: {
        id: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        image: null,
      },
      session: { userId: "user-1" },
    });
    mocks.findUnique.mockResolvedValue({
      resumeText: "Built distributed systems.",
      onboardingRole: "Software Engineer - Backend",
      onboardingLevel: "senior",
      onboardingCompany: "Google",
      onboardingGoal: "switch-companies",
      preferredInterviewType: "system-design",
    });

    const result = await SettingsPage();

    expect(mocks.getServerAuthSession).toHaveBeenCalledOnce();
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        resumeText: true,
        onboardingRole: true,
        onboardingLevel: true,
        onboardingCompany: true,
        onboardingGoal: true,
        preferredInterviewType: true,
      },
    });
    expect((result as React.ReactElement<{
      user: unknown;
      initialResumeText: unknown;
      initialOnboardingPrefs: unknown;
    }>).props).toEqual({
      user: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        image: null,
      },
      initialResumeText: "Built distributed systems.",
      initialOnboardingPrefs: {
        onboardingRole: "Software Engineer - Backend",
        onboardingLevel: "senior",
        onboardingCompany: "Google",
        onboardingGoal: "switch-companies",
        preferredInterviewType: "system-design",
      },
    });
  });
});
