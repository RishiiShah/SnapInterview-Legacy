import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PUT } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("/api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("GET returns normalized onboarding defaults", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      onboardingCompletedAt: null,
      onboardingRole: null,
      onboardingLevel: null,
      onboardingCompany: null,
      onboardingGoal: null,
      preferredInterviewType: null,
    } as any);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      onboardingCompleted: false,
      onboardingRole: "",
      onboardingLevel: "mid-level",
      onboardingCompany: "",
      onboardingGoal: "switch-companies",
      preferredInterviewType: "behavioral",
    });
  });

  it("PUT validates and persists onboarding preferences", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user-1" } as any);

    const request = new Request("http://localhost/api/onboarding", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        onboardingRole: "Frontend Engineer",
        onboardingLevel: "mid-level",
        onboardingCompany: "",
        onboardingGoal: "switch-companies",
        preferredInterviewType: "technical",
      }),
    });

    const response = await PUT(request);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          onboardingRole: "Frontend Engineer",
          onboardingLevel: "mid-level",
          onboardingCompany: null,
          onboardingGoal: "switch-companies",
          preferredInterviewType: "technical",
          isFirstLogin: false,
        }),
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("PUT returns 400 for invalid onboarding payload", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const request = new Request("http://localhost/api/onboarding", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        onboardingRole: "",
        onboardingLevel: "mid-level",
        onboardingCompany: "",
        onboardingGoal: "switch-companies",
        preferredInterviewType: "technical",
      }),
    });

    const response = await PUT(request);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Target role is required" });
  });
});