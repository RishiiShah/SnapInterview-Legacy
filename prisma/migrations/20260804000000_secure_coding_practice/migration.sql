-- Preserve completed legacy coding progress before removing duplicate legacy rows.
INSERT INTO "CodingSolved" ("userId", "codingQuestionId", "solvedAt")
SELECT
  solved."userId",
  'legacy-coding-' || legacy."id",
  solved."solvedAt"
FROM "SolvedQuestion" AS solved
JOIN "PracticeQuestion" AS legacy ON legacy."id" = solved."questionId"
JOIN "CodingQuestion" AS coding ON coding."id" = 'legacy-coding-' || legacy."id"
WHERE legacy."category" = 'coding'
ON CONFLICT ("userId", "codingQuestionId") DO NOTHING;

-- Coding rows were moved to CodingQuestion in the prior migration. Removing their
-- legacy copies prevents global search from returning the same problem twice.
DELETE FROM "PracticeQuestion"
WHERE "category" = 'coding'
  AND EXISTS (
    SELECT 1
    FROM "CodingQuestion"
    WHERE "CodingQuestion"."id" = 'legacy-coding-' || "PracticeQuestion"."id"
  );

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "InterviewSession_search_scope_idx"
  ON "InterviewSession" ("userId", "status", "deletedAt", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "InterviewSession_role_trgm_idx"
  ON "InterviewSession" USING GIN ("role" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "InterviewSession_company_trgm_idx"
  ON "InterviewSession" USING GIN ("company" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "InterviewSession_type_trgm_idx"
  ON "InterviewSession" USING GIN ("type" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "PracticeQuestion_text_trgm_idx"
  ON "PracticeQuestion" USING GIN ("text" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PracticeQuestion_category_trgm_idx"
  ON "PracticeQuestion" USING GIN ("category" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PracticeQuestion_tags_gin_idx"
  ON "PracticeQuestion" USING GIN ("tags");

CREATE INDEX IF NOT EXISTS "CodingQuestion_title_trgm_idx"
  ON "CodingQuestion" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CodingQuestion_description_trgm_idx"
  ON "CodingQuestion" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CodingQuestion_topics_gin_idx"
  ON "CodingQuestion" USING GIN ("topics");
