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
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

    const response = await GET();

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      onboardingCompleted: false,
      onboardingRole: "",
      onboardingLevel: "mid-level",
      onboardingCompany: "",
      onboardingGoal: "switch-companies",
      preferredInterviewType: "behavioral-leadership",
    });
  });

  it("PUT validates and persists onboarding preferences", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        select: { id: true },
        data: expect.objectContaining({
          onboardingCompletedAt: expect.any(Date),
          onboardingRole: "Frontend Engineer",
          onboardingLevel: "mid-level",
          onboardingCompany: null,
          onboardingGoal: "switch-companies",
          preferredInterviewType: "coding-algorithms",
          isFirstLogin: false,
        }),
      })
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
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

  it("PUT rejects oversized onboarding text fields", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const request = new Request("http://localhost/api/onboarding", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        onboardingRole: "R".repeat(201),
        onboardingLevel: "L".repeat(65),
        onboardingCompany: "",
        onboardingGoal: "G".repeat(201),
        preferredInterviewType: "technical",
      }),
    });

    const response = await PUT(request);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
  });
});
