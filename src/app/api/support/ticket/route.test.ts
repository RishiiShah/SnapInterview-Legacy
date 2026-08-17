import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { sendSupportTicketEmailMock, getServerAuthSessionMock, createSupportTicketMock } = vi.hoisted(() => ({
  sendSupportTicketEmailMock: vi.fn(),
  getServerAuthSessionMock: vi.fn(),
  createSupportTicketMock: vi.fn(),
}));

vi.mock("@/lib/server-auth", () => ({
  getServerAuthSession: getServerAuthSessionMock,
}));

vi.mock("@/lib/email", () => ({
  sendSupportTicketEmail: sendSupportTicketEmailMock,
}));

vi.mock("@/repositories/support-ticket-repo", () => ({
  createSupportTicket: createSupportTicketMock,
}));

vi.mock("@/lib/route-security", () => ({
  withCsrfProtection: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

vi.mock("@/lib/env", () => ({
  env: {
    FORMSPREE_SUPPORT_URL: "https://formspree.io/f/test-endpoint",
  },
}));

describe("POST /api/support/ticket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  });

  it("returns 401 if user is not authenticated", async () => {
    getServerAuthSessionMock.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/support/ticket", {
      method: "POST",
      body: JSON.stringify({
        subject: "Need help",
        description: "Something is broken",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 if subject or description is missing", async () => {
    getServerAuthSessionMock.mockResolvedValue({
      user: { id: "u1", email: "user@example.com", name: "User One" },
    });

    const req = new NextRequest("http://localhost:3000/api/support/ticket", {
      method: "POST",
      body: JSON.stringify({
        subject: "",
        description: "Something is broken",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("forwards ticket to Formspree and sends confirmation email with sequential DB ticket code", async () => {
    getServerAuthSessionMock.mockResolvedValue({
      user: { id: "u1", email: "user@example.com", name: "User One" },
    });
    createSupportTicketMock.mockResolvedValue({
      ticketNumber: 1042,
      ticketCode: "SUP-1042",
      id: "ticket-cuid-1",
    });

    const req = new NextRequest("http://localhost:3000/api/support/ticket", {
      method: "POST",
      body: JSON.stringify({
        category: "technical",
        priority: "high",
        subject: "Microphone permission issue",
        description: "Cannot enable microphone in Safari",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ticketId).toBe("SUP-1042");

    // Verify Formspree fetch call with SUP-1042
    expect(global.fetch).toHaveBeenCalledWith(
      "https://formspree.io/f/test-endpoint",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.stringContaining("SUP-1042"),
      })
    );

    // Verify email call with SUP-1042
    expect(sendSupportTicketEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: "SUP-1042",
        userEmail: "user@example.com",
        subject: "Microphone permission issue",
      })
    );
  });

  it("uses collision-free fallback when database persistence returns null", async () => {
    getServerAuthSessionMock.mockResolvedValue({
      user: { id: "u1", email: "user@example.com", name: "User One" },
    });
    createSupportTicketMock.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/support/ticket", {
      method: "POST",
      body: JSON.stringify({
        category: "technical",
        priority: "high",
        subject: "Fallback test",
        description: "Testing fallback ID generation",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.ticketId).toMatch(/^SUP-[A-Z0-9]+-[A-Z0-9]+$/);
  });
});
