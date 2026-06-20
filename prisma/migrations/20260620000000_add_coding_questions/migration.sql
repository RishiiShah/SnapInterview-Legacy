-- AlterTable
ALTER TABLE "PracticeQuestion" ADD COLUMN     "constraints" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "solutionCode" JSONB,
ADD COLUMN     "starterCode" JSONB,
ADD COLUMN     "testCases" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text';
