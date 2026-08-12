-- Final evaluation calls an external model. Track a versioned, recoverable
-- claim so duplicate requests cannot perform or overwrite the same work.
ALTER TABLE "InterviewSession"
  ADD COLUMN IF NOT EXISTS "evaluationStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evaluationClaimVersion" INTEGER NOT NULL DEFAULT 0;
