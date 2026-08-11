-- Security settings reads only inspect recent successful and failed login
-- events, ordered newest first. Keep those hot, narrow slices separate from
-- password/reset/session audit writes, which should not pay for a wider index.
-- User ID covers current events; email covers historical events written before
-- an account ID was known.
CREATE INDEX IF NOT EXISTS "SecurityEvent_login_user_activity_idx"
  ON "SecurityEvent" ("userId", "createdAt" DESC)
  WHERE "type" IN ('LOGIN_SUCCESS', 'LOGIN_FAILED');

CREATE INDEX IF NOT EXISTS "SecurityEvent_login_email_activity_idx"
  ON "SecurityEvent" ("email", "createdAt" DESC)
  WHERE "type" IN ('LOGIN_SUCCESS', 'LOGIN_FAILED');
