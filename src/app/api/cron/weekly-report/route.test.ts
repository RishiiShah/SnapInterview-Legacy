import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { findWeeklyReportRecipients } from "@/repositories/user-repo";
import { sendWeeklyReportEmail } from "@/lib/email";

vi.mock("@/lib/env", () => ({
  env: { CRON_SECRET: "test-secret" },
}));

vi.mock("@/repositories/user-repo", () => ({
  findWeeklyReportRecipients: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendWeeklyReportEmail: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/cron/weekly-report", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/weekly-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authorization header", async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when bearer token is wrong", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret") as never);
    expect(res.status).toBe(401);
  });

  it("returns 200 with counts when all emails succeed", async () => {
    const recipients = [
      {
        userId: "u1",
        email: "a@example.com",
        name: "Alice",
        sessionsCount: 3,
        avgScore: 78,
        bestRole: "Software Engineer",
        bestScore: 85,
      },
      {
        userId: "u2",
        email: "b@example.com",
        name: "Bob",
        sessionsCount: 1,
        avgScore: null,
        bestRole: null,
        bestScore: null,
      },
    ];
    vi.mocked(findWeeklyReportRecipients).mockResolvedValue(recipients);
    vi.mocked(sendWeeklyReportEmail).mockResolvedValue(undefined);

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent: 2, failed: 0, total: 2 });
    expect(sendWeeklyReportEmail).toHaveBeenCalledTimes(2);
    expect(sendWeeklyReportEmail).toHaveBeenCalledWith({
      to: "a@example.com",
      name: "Alice",
      sessionsCount: 3,
      avgScore: 78,
      bestRole: "Software Engineer",
      bestScore: 85,
    });
  });

  it("counts partial failures and continues sending", async () => {
    const recipients = [
      {
        userId: "u1",
        email: "a@example.com",
        name: "Alice",
        sessionsCount: 2,
        avgScore: 70,
        bestRole: "PM",
        bestScore: 75,
      },
      {
        userId: "u2",
        email: "b@example.com",
        name: "Bob",
        sessionsCount: 1,
        avgScore: null,
        bestRole: null,
        bestScore: null,
      },
    ];
    vi.mocked(findWeeklyReportRecipients).mockResolvedValue(recipients);
    vi.mocked(sendWeeklyReportEmail)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("SMTP timeout"));

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent: 1, failed: 1, total: 2 });
  });

  it("returns 200 with zero counts when no recipients", async () => {
    vi.mocked(findWeeklyReportRecipients).mockResolvedValue([]);

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent: 0, failed: 0, total: 0 });
    expect(sendWeeklyReportEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when repository throws", async () => {
    vi.mocked(findWeeklyReportRecipients).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
