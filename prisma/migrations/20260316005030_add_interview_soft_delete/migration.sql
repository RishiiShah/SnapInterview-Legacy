-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "InterviewSession_userId_deletedAt_idx" ON "InterviewSession"("userId", "deletedAt");
