-- AlterTable
ALTER TABLE "User" ADD COLUMN "resumeText" TEXT;

-- CreateTable
CREATE TABLE "QuestionFeedback" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "questionOrder" INTEGER NOT NULL,
    "rating" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionFeedback_interviewSessionId_idx" ON "QuestionFeedback"("interviewSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionFeedback_interviewSessionId_questionOrder_key" ON "QuestionFeedback"("interviewSessionId", "questionOrder");

-- AddForeignKey
ALTER TABLE "QuestionFeedback" ADD CONSTRAINT "QuestionFeedback_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
