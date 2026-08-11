-- The solved-question endpoint scopes by user and returns newest activity first.
-- Keep this ordered lookup indexed as a user's solved history grows.
CREATE INDEX IF NOT EXISTS "SolvedQuestion_user_solvedAt_desc_idx"
  ON "SolvedQuestion" ("userId", "solvedAt" DESC);
