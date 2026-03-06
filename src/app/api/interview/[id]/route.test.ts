import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      findFirst: vi.fn(),
    },
  },
}));

describe("GET /api/interview/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const request = new Request("http://localhost/api/interview/00000000-0000-0000-0000-000000000000");
    const response = await GET(request, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid interview id", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const request = new Request("http://localhost/api/interview/not-a-uuid");
    const response = await GET(request, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid interview ID" });
  });

  it("returns 404 when session is not owned by user", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.interviewSession.findFirst).mockResolvedValue(null);

    const interviewId = "11111111-1111-4111-8111-111111111111";
    const request = new Request(`http://localhost/api/interview/${interviewId}`);
    const response = await GET(request, {
      params: Promise.resolve({ id: interviewId }),
    });

    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: interviewId, userId: "user-1" },
      })
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Interview session not found" });
  });
});
