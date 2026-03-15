-- CreateTable
CREATE TABLE "PracticeQuestion" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedTime" TEXT,
    "tags" TEXT[],
    "hint" TEXT,
    "sampleAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeQuestion_slug_key" ON "PracticeQuestion"("slug");

-- AddForeignKey
ALTER TABLE "SolvedQuestion" ADD CONSTRAINT "SolvedQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PracticeQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
