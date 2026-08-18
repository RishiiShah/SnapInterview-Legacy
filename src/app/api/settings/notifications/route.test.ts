import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET, PUT } from "./route";

import { prisma } from "@/lib/prisma";
import { csrfRejectIfInvalid } from "@/lib/csrf";
import { getSessionUserIdentity } from "@/lib/server-auth";
import {
  findPracticeReminderRecipients,
  findWeeklyReportRecipients,
  getNotificationPrefs,
} from "@/repositories/user-repo";

vi.mock("@/lib/csrf", () => ({
  csrfRejectIfInvalid: vi.fn(() => null),
}));

vi.mock("@/lib/server-auth", () => ({
  getSessionUserIdentity: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("GET /api/settings/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns notification preferences", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      notificationPrefs: {
        emailNotifs: true,
        practiceReminders: false,
        weeklyReport: true,
        scoreAlerts: false,
      },
    } as never);

    const res = await GET();
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notificationPrefs).toMatchObject({
      emailNotifs: true,
      practiceReminders: false,
    });
  });

  it("keeps stored email opt-outs consistent for settings and email eligibility", async () => {
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      notificationPrefs: { emailNotifs: false },
    } as never);
    vi.mocked(prisma.user.findMany)
      .mockResolvedValueOnce([{
        id: "user-1",
        email: "user@example.com",
        name: "Example User",
        notificationPrefs: { emailNotifs: false },
        interviewSessions: [{ role: "Engineer", evaluation: { score: 80 } }],
      }] as never)
      .mockResolvedValueOnce([{
        id: "user-1",
        email: "user@example.com",
        name: "Example User",
        notificationPrefs: { emailNotifs: false },
        interviewSessions: [{ createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }],
      }] as never);

    const [prefs, weeklyRecipients, practiceRecipients, res] = await Promise.all([
      getNotificationPrefs("user-1"),
      findWeeklyReportRecipients(),
      findPracticeReminderRecipients(),
      GET(),
    ]);

    expect(prefs.emailNotifs).toBe(false);
    expect(weeklyRecipients).toEqual([]);
    expect(practiceRecipients).toEqual([]);
    expect(await res.json()).toEqual({
      notificationPrefs: {
        emailNotifs: false,
        practiceReminders: true,
        weeklyReport: true,
        scoreAlerts: false,
      },
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
    vi.mocked(getSessionUserIdentity).mockResolvedValue(null);

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
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

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
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

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
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notificationPrefs).toMatchObject(newPrefs);
  });

  it("returns 400 when request body is malformed JSON", async () => {
    vi.mocked(csrfRejectIfInvalid).mockReturnValue(null);
    vi.mocked(getSessionUserIdentity).mockResolvedValue({ userId: "user-1", email: "user@example.com" });

    const req = new Request("http://localhost/api/settings/notifications", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: "not-json",
    });

    const res = await PUT(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON body" });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
