import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET, PUT } from "./route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getServerAuthSession } from "@/lib/server-auth";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("GET /api/settings/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns notification preferences", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      notificationPrefs: {
        emailNotifs: true,
        practiceReminders: false,
        weeklyReport: true,
        scoreAlerts: false,
      },
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notificationPrefs).toMatchObject({
      emailNotifs: true,
      practiceReminders: false,
    });
  });
});

describe("PUT /api/settings/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits when CSRF validation fails", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const req = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await PUT(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        emailNotifs: true,
        practiceReminders: true,
        weeklyReport: true,
        scoreAlerts: false,
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("rejects invalid preferences", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);

    const req = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        emailNotifs: "not-a-boolean",
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("updates notification preferences", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com" },
    } as never);

    const newPrefs = {
      emailNotifs: false,
      practiceReminders: true,
      weeklyReport: false,
      scoreAlerts: true,
    };

    vi.mocked(prisma.user.update).mockResolvedValue({
      notificationPrefs: newPrefs,
    } as never);

    const req = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(newPrefs),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notificationPrefs).toMatchObject(newPrefs);
  });
});
