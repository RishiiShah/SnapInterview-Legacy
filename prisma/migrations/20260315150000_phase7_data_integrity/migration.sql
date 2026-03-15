DELETE FROM "PendingUser" AS stale
USING "PendingUser" AS newest
WHERE stale.email = newest.email
  AND (
    stale."createdAt" < newest."createdAt"
    OR (stale."createdAt" = newest."createdAt" AND stale.id < newest.id)
  );

WITH duplicate_video_keys AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "videoKey"
      ORDER BY "createdAt" DESC, id DESC
    ) AS rank
  FROM "InterviewSession"
  WHERE "videoKey" IS NOT NULL
)
UPDATE "InterviewSession"
SET
  "videoKey" = NULL,
  "videoUrl" = NULL
WHERE id IN (
  SELECT id
  FROM duplicate_video_keys
  WHERE rank > 1
);

UPDATE "InterviewSession"
SET "questionCount" = 10
WHERE "questionCount" NOT IN (5, 10, 15);

UPDATE "InterviewSession"
SET "currentQuestion" = LEAST(GREATEST("currentQuestion", 0), "questionCount")
WHERE "currentQuestion" < 0 OR "currentQuestion" > "questionCount";

DROP INDEX IF EXISTS "PendingUser_email_idx";

CREATE UNIQUE INDEX "PendingUser_email_key"
ON "PendingUser"("email");

CREATE UNIQUE INDEX "InterviewSession_videoKey_key"
ON "InterviewSession"("videoKey");

ALTER TABLE "InterviewSession"
ADD CONSTRAINT "InterviewSession_questionCount_valid"
CHECK ("questionCount" IN (5, 10, 15));

ALTER TABLE "InterviewSession"
ADD CONSTRAINT "InterviewSession_currentQuestion_bounds"
CHECK ("currentQuestion" >= 0 AND "currentQuestion" <= "questionCount");
