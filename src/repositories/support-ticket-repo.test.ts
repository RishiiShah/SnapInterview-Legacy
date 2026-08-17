import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupportTicket, getSupportTicketByCode } from "./support-ticket-repo";
import { prisma } from "@/lib/prisma";

describe("support-ticket-repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a support ticket and returns sequential ticket code", async () => {
    vi.spyOn(prisma.supportTicket, "create").mockResolvedValue({
      id: "ticket-1",
      ticketNumber: 1055,
      userId: "user-1",
      userEmail: "user@example.com",
      userName: "Alex",
      category: "billing",
      priority: "high",
      subject: "Billing issue",
      description: "Need invoice",
      attachmentName: null,
      attachmentUrl: null,
      status: "OPEN",
      resolvedAt: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createSupportTicket({
      userId: "user-1",
      userEmail: "user@example.com",
      userName: "Alex",
      category: "billing",
      priority: "high",
      subject: "Billing issue",
      description: "Need invoice",
    });

    expect(result).toEqual({
      ticketNumber: 1055,
      ticketCode: "SUP-1055",
      id: "ticket-1",
    });
  });

  it("looks up support ticket by ticket code", async () => {
    const mockDate = new Date();
    vi.spyOn(prisma.supportTicket, "findUnique").mockResolvedValue({
      ticketNumber: 1055,
      category: "billing",
      priority: "high",
      subject: "Billing issue",
      status: "OPEN",
      createdAt: mockDate,
      resolvedAt: null,
    } as any);

    const ticket = await getSupportTicketByCode("SUP-1055");
    expect(ticket).toEqual({
      ticketCode: "SUP-1055",
      category: "billing",
      priority: "high",
      subject: "Billing issue",
      status: "OPEN",
      createdAt: mockDate,
      resolvedAt: null,
    });
  });

  it("returns null for invalid ticket code formats", async () => {
    const invalidResult = await getSupportTicketByCode("INVALID-CODE");
    expect(invalidResult).toBeNull();
  });
});
