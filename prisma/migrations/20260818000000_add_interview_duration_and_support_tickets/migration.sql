-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 30;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "public"."TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachmentName" TEXT,
    "attachmentUrl" TEXT,
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_key" ON "public"."SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_createdAt_idx" ON "public"."SupportTicket"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_ticketNumber_idx" ON "public"."SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_status_createdAt_idx" ON "public"."SupportTicket"("status", "createdAt" DESC);

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "public"."SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
