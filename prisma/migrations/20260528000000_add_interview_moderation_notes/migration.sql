-- CreateTable
CREATE TABLE "InterviewModerationNote" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewModerationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewModerationNote_interviewSessionId_createdAt_idx" ON "InterviewModerationNote"("interviewSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "InterviewModerationNote" ADD CONSTRAINT "InterviewModerationNote_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
