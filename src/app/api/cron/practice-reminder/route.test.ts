import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { findPracticeReminderRecipients } from "@/repositories/user-repo";
import { sendPracticeReminderEmail } from "@/lib/email";

vi.mock("@/lib/env", () => ({
  env: { CRON_SECRET: "test-secret" },
}));

vi.mock("@/repositories/user-repo", () => ({
  findPracticeReminderRecipients: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendPracticeReminderEmail: vi.fn(),
}));

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/cron/practice-reminder", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("GET /api/cron/practice-reminder", () => {
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
      { userId: "u1", email: "a@example.com", name: "Alice", daysSinceLast: 5 },
      { userId: "u2", email: "b@example.com", name: "Bob", daysSinceLast: 7 },
    ];
    vi.mocked(findPracticeReminderRecipients).mockResolvedValue(recipients);
    vi.mocked(sendPracticeReminderEmail).mockResolvedValue(undefined);

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent: 2, failed: 0, total: 2 });
    expect(sendPracticeReminderEmail).toHaveBeenCalledTimes(2);
    expect(sendPracticeReminderEmail).toHaveBeenCalledWith({
      to: "a@example.com",
      name: "Alice",
      daysSinceLast: 5,
    });
  });

  it("counts partial failures and continues sending", async () => {
    const recipients = [
      { userId: "u1", email: "a@example.com", name: "Alice", daysSinceLast: 4 },
      { userId: "u2", email: "b@example.com", name: "Bob", daysSinceLast: 6 },
    ];
    vi.mocked(findPracticeReminderRecipients).mockResolvedValue(recipients);
    vi.mocked(sendPracticeReminderEmail)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("SMTP failure"));

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent: 1, failed: 1, total: 2 });
  });

  it("delivers reminders in bounded concurrent batches", async () => {
    const recipients = Array.from({ length: 6 }, (_, index) => ({
      userId: `u${index}`,
      email: `user${index}@example.com`,
      name: `User ${index}`,
      daysSinceLast: index + 3,
    }));
    const deliveries = recipients.map(() => deferred<void>());
    vi.mocked(findPracticeReminderRecipients).mockResolvedValue(recipients);
    vi.mocked(sendPracticeReminderEmail).mockImplementation((params) => {
      const recipientIndex = recipients.findIndex((recipient) => recipient.email === params.to);
      return deliveries[recipientIndex]!.promise;
    });

    const response = GET(makeRequest("Bearer test-secret") as never);

    await vi.waitFor(() => expect(sendPracticeReminderEmail).toHaveBeenCalledTimes(5));
    for (const delivery of deliveries.slice(0, 5)) {
      delivery.resolve();
    }
    await vi.waitFor(() => expect(sendPracticeReminderEmail).toHaveBeenCalledTimes(6));
    deliveries[5]!.resolve();

    await expect(response).resolves.toHaveProperty("status", 200);
  });

  it("returns 200 with zero counts when no recipients", async () => {
    vi.mocked(findPracticeReminderRecipients).mockResolvedValue([]);

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ sent: 0, failed: 0, total: 0 });
    expect(sendPracticeReminderEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when repository throws", async () => {
    vi.mocked(findPracticeReminderRecipients).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
