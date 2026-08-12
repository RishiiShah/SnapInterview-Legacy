import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthSession } from "@/lib/server-auth";
import { sendSupportTicketEmail } from "@/lib/email";

vi.mock("@/lib/server-auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendSupportTicketEmail: vi.fn() }));
vi.mock("@/lib/csrf", () => ({ csrfRejectIfInvalid: vi.fn(() => null) }));
vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: vi.fn(() => ({ isLimited: vi.fn(() => false) })),
}));

describe("POST /api/support/ticket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an oversized support message before sending email", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { email: "user@example.com", name: "User" },
    } as never);

    const response = await POST(new Request("http://localhost/api/support/ticket", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        category: "technical",
        priority: "normal",
        subject: "Need help",
        description: "x".repeat(10_001),
      }),
    }) as never);

    expect(response.status).toBe(400);
    expect(sendSupportTicketEmail).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before sending email", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", name: "User" },
    } as never);

    const response = await POST(new Request("http://localhost/api/support/ticket", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: "{",
    }) as never);

    expect(response.status).toBe(400);
    expect(sendSupportTicketEmail).not.toHaveBeenCalled();
  });

  it("rejects bytes that do not match the declared image type", async () => {
    vi.mocked(getServerAuthSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com", name: "User" },
    } as never);

    const response = await POST(new Request("http://localhost/api/support/ticket", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        category: "technical",
        priority: "normal",
        subject: "Need help",
        description: "The attachment should be rejected.",
        attachmentName: "screenshot.png",
        attachmentBase64: "data:image/png;base64,/9j/4AAQSkZJRg==",
      }),
    }) as never);

    expect(response.status).toBe(400);
    expect(sendSupportTicketEmail).not.toHaveBeenCalled();
  });
});
