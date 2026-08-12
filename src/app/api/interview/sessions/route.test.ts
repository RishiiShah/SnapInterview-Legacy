import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/repositories/interview-repo", () => ({
  listCompletedSessionsForUser: vi.fn(),
}));

import { getSessionUserIdentity } from "@/lib/server-auth";
import { listCompletedSessionsForUser } from "@/repositories/interview-repo";
import { GET } from "./route";

describe("GET /api/interview/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessionUserIdentity).mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
    });
  });

  it("returns a stable next cursor for the next recordings page", async () => {
    vi.mocked(listCompletedSessionsForUser).mockResolvedValue({
      sessions: [{
        id: "22222222-2222-4222-8222-222222222222",
        role: "Frontend Engineer",
        company: null,
        type: "coding-algorithms",
        videoKey: null,
        score: 88,
        createdAt: new Date("2026-08-10T12:00:00.000Z"),
      }],
      hasMore: true,
      nextCursor: {
        createdAt: new Date("2026-08-10T12:00:00.000Z"),
        id: "22222222-2222-4222-8222-222222222222",
      },
    });

    const response = await GET(new NextRequest("http://localhost/api/interview/sessions?limit=12"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessions: [{
        id: "22222222-2222-4222-8222-222222222222",
        role: "Frontend Engineer",
        company: null,
        type: "coding-algorithms",
        videoKey: null,
        score: 88,
        createdAt: "2026-08-10T12:00:00.000Z",
      }],
      hasMore: true,
      nextCursor: {
        createdAt: "2026-08-10T12:00:00.000Z",
        id: "22222222-2222-4222-8222-222222222222",
      },
    });
  });
});
