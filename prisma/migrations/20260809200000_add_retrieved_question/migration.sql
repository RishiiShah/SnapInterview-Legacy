-- CreateTable
CREATE TABLE "RetrievedQuestion" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "questionCorpusId" TEXT NOT NULL,
    "questionOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetrievedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetrievedQuestion_interviewSessionId_questionCorpusId_key"
    ON "RetrievedQuestion"("interviewSessionId", "questionCorpusId");

-- CreateIndex
CREATE INDEX "RetrievedQuestion_interviewSessionId_idx" ON "RetrievedQuestion"("interviewSessionId");

-- CreateIndex
CREATE INDEX "RetrievedQuestion_questionCorpusId_idx" ON "RetrievedQuestion"("questionCorpusId");

-- AddForeignKey
ALTER TABLE "RetrievedQuestion" ADD CONSTRAINT "RetrievedQuestion_interviewSessionId_fkey"
    FOREIGN KEY ("interviewSessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetrievedQuestion" ADD CONSTRAINT "RetrievedQuestion_questionCorpusId_fkey"
    FOREIGN KEY ("questionCorpusId") REFERENCES "QuestionCorpus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
