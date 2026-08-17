import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerAuthSession: vi.fn(),
  getDashboardOverviewData: vi.fn(),
  userFindUnique: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: mocks.getServerAuthSession,
}));

vi.mock("@/lib/interview/metrics", () => ({
  getDashboardOverviewData: mocks.getDashboardOverviewData,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/components/dashboard/DashboardOverviewClient", () => ({
  default: () => null,
}));

import DashboardPage from "./page";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerAuthSession.mockResolvedValue({
      user: { id: "user-1", email: "candidate@example.com", name: "Candidate User" },
      session: { userId: "user-1" },
    });
  });

  it("loads onboarding state and overview data concurrently by user ID", async () => {
    const onboarding = deferred<{ onboardingCompletedAt: Date; resumeText: string | null }>();
    const overview = deferred<{
      stats: [];
      recentSessions: [];
      topStrength: null;
      topFocus: null;
    }>();
    mocks.userFindUnique.mockReturnValue(onboarding.promise);
    mocks.getDashboardOverviewData.mockReturnValue(overview.promise);

    const page = DashboardPage();

    await vi.waitFor(() => {
      expect(mocks.userFindUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { onboardingCompletedAt: true, resumeText: true },
      });
      expect(mocks.getDashboardOverviewData).toHaveBeenCalledWith("user-1");
    });

    onboarding.resolve({ onboardingCompletedAt: new Date(), resumeText: null });
    overview.resolve({ stats: [], recentSessions: [], topStrength: null, topFocus: null });

    await page;
  });
});
