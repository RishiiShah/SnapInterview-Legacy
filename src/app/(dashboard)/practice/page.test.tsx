import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import PracticePage from "./page";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

describe("PracticePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates Practice setup from one authenticated server-side user read", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      onboardingRole: "Software Engineer - Backend",
      onboardingLevel: "senior",
      onboardingCompany: "OpenAI",
      onboardingGoal: "switch-companies",
      preferredInterviewType: "technical",
      resumeText: "Built reliable APIs.",
    } as never);

    const page = await PracticePage({
      searchParams: Promise.resolve({ type: "system-design" }),
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        onboardingRole: true,
        onboardingLevel: true,
        onboardingCompany: true,
        onboardingGoal: true,
        preferredInterviewType: true,
        resumeText: true,
      },
    });
    expect(page.props).toMatchObject({
      retakeDefaults: { type: "system-design" },
      initialDefaults: {
        onboarding: {
          onboardingRole: "Software Engineer - Backend",
          onboardingCompany: "OpenAI",
          onboardingLevel: "senior",
          onboardingGoal: "switch-companies",
          preferredInterviewType: "coding-algorithms",
        },
        resumeText: "Built reliable APIs.",
      },
    });
  });
});
