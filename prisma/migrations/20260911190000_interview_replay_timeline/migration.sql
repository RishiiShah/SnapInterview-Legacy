CREATE TABLE "InterviewReplayTurn" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "transcriptOrder" INTEGER NOT NULL,
    "questionStartMs" INTEGER,
    "questionEndMs" INTEGER,
    "answerStartMs" INTEGER,
    "answerEndMs" INTEGER,
    "timingSource" TEXT NOT NULL DEFAULT 'browser-v1',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InterviewReplayTurn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InterviewReplayTurn_interviewSessionId_transcriptOrder_key"
ON "InterviewReplayTurn"("interviewSessionId", "transcriptOrder");

CREATE INDEX "InterviewReplayTurn_interviewSessionId_idx"
ON "InterviewReplayTurn"("interviewSessionId");

ALTER TABLE "InterviewReplayTurn" ADD CONSTRAINT "InterviewReplayTurn_interviewSessionId_fkey"
FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
