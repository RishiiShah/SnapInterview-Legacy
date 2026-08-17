import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

export type CreateSupportTicketInput = {
  userId: string;
  userEmail: string;
  userName: string;
  category: string;
  priority?: string;
  subject: string;
  description: string;
  attachmentName?: string;
  attachmentUrl?: string;
};

export async function createSupportTicket(input: CreateSupportTicketInput) {
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: input.userId,
        userEmail: input.userEmail,
        userName: input.userName,
        category: input.category,
        priority: input.priority || "normal",
        subject: input.subject,
        description: input.description,
        attachmentName: input.attachmentName,
        attachmentUrl: input.attachmentUrl,
      },
    });

    return {
      ticketNumber: ticket.ticketNumber,
      ticketCode: `SUP-${ticket.ticketNumber}`,
      id: ticket.id,
    };
  } catch (error) {
    logger.error("Failed to persist support ticket in database", {
      error: error instanceof Error ? error.message : String(error),
      userId: input.userId,
    });
    return null;
  }
}

export async function getSupportTicketByCode(ticketCode: string) {
  const match = ticketCode.match(/^SUP-(\d+)$/i);
  if (!match) return null;

  const ticketNumber = parseInt(match[1], 10);
  if (isNaN(ticketNumber)) return null;

  try {
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketNumber },
      select: {
        ticketNumber: true,
        category: true,
        priority: true,
        subject: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    if (!ticket) return null;

    return {
      ticketCode: `SUP-${ticket.ticketNumber}`,
      category: ticket.category,
      priority: ticket.priority,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt,
      resolvedAt: ticket.resolvedAt,
    };
  } catch (error) {
    logger.error("Failed to lookup support ticket by code", {
      error: error instanceof Error ? error.message : String(error),
      ticketCode,
    });
    return null;
  }
}
