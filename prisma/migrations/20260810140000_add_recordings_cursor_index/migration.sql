-- Supports stable keyset pagination for a user's completed recordings.
-- The ID tie-breaker lets PostgreSQL seek beyond equal creation timestamps.
CREATE INDEX IF NOT EXISTS "InterviewSession_recordings_cursor_idx"
  ON "InterviewSession" ("userId", "status", "deletedAt", "createdAt" DESC, "id" DESC);
