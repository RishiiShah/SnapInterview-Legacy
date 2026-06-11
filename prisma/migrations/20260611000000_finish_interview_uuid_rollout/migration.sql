-- Finish the interview UUID rollout for databases created before InterviewSession.id
-- was treated as a UUID in application code. Existing child FKs use ON UPDATE
-- CASCADE, so updating the parent primary key rewrites TranscriptEntry,
-- QuestionFeedback, and InterviewModerationNote references in the same transaction.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TEMP TABLE "_interview_session_uuid_rollout" (
    "oldId" TEXT PRIMARY KEY,
    "newId" TEXT NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO "_interview_session_uuid_rollout" ("oldId", "newId")
SELECT
    "id" AS "oldId",
    gen_random_uuid()::TEXT AS "newId"
FROM "InterviewSession"
WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "_interview_session_uuid_rollout" map
        INNER JOIN "InterviewSession" session ON session."id" = map."newId"
    ) THEN
        RAISE EXCEPTION 'Generated interview UUID conflicts with an existing InterviewSession.id';
    END IF;
END $$;

UPDATE "InterviewSession" session
SET "id" = map."newId"
FROM "_interview_session_uuid_rollout" map
WHERE session."id" = map."oldId";

ALTER TABLE "InterviewSession"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

ALTER TABLE "InterviewSession"
DROP CONSTRAINT IF EXISTS "InterviewSession_id_uuid_format";

ALTER TABLE "InterviewSession"
ADD CONSTRAINT "InterviewSession_id_uuid_format"
CHECK ("id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
