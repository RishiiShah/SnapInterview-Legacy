-- Analytics: serve a user's full session timeline ordered by most recent.
CREATE INDEX IF NOT EXISTS "InterviewSession_userId_deletedAt_createdAt_idx"
  ON "InterviewSession"("userId", "deletedAt", "createdAt" DESC);

-- Authentication/session hygiene: token lookups remain covered by the unique
-- token index; these indexes support account reads by user and expiry cleanup.
CREATE INDEX IF NOT EXISTS "Account_userId_idx"
  ON "Account"("userId");

CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx"
  ON "Session"("expiresAt");
