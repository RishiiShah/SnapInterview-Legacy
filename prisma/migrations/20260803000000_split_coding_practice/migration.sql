CREATE TABLE "CodingQuestion" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "constraints" TEXT,
  "difficulty" TEXT NOT NULL,
  "topics" TEXT[] NOT NULL,
  "estimatedTime" TEXT,
  "hint" TEXT,
  "starterCode" JSONB NOT NULL,
  "solutionCode" JSONB,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CodingQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodingTestCase" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "input" TEXT NOT NULL,
  "expectedOutput" TEXT NOT NULL,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "CodingTestCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodingSubmission" (
  "id" TEXT NOT NULL,
  "clientSubmissionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codingQuestionId" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "verdict" TEXT NOT NULL,
  "passedCount" INTEGER NOT NULL,
  "totalCount" INTEGER NOT NULL,
  "caseResults" JSONB,
  "executionTimeMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CodingSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodingSolved" (
  "userId" TEXT NOT NULL,
  "codingQuestionId" TEXT NOT NULL,
  "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CodingSolved_pkey" PRIMARY KEY ("userId", "codingQuestionId")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PracticeQuestion"
    WHERE ("type" = 'coding' OR "category" = 'coding')
      AND (
        "starterCode" IS NULL
        OR jsonb_typeof("starterCode") <> 'object'
        OR (
          COALESCE(NULLIF("starterCode"->>'javascript', ''), NULLIF("starterCode"->>'python', ''), NULLIF("starterCode"->>'cpp', '')) IS NULL
        )
      )
  ) THEN
    RAISE EXCEPTION 'Cannot backfill coding questions: every legacy coding row needs non-empty JavaScript, Python, or C++ starter code.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PracticeQuestion"
    WHERE ("type" = 'coding' OR "category" = 'coding')
      AND ("testCases" IS NULL OR jsonb_typeof("testCases") <> 'array' OR jsonb_array_length("testCases") = 0)
  ) THEN
    RAISE EXCEPTION 'Cannot backfill coding questions: every legacy coding row needs at least one testcase.';
  END IF;
END $$;

INSERT INTO "CodingQuestion" (
  "id", "slug", "title", "description", "constraints", "difficulty", "topics",
  "estimatedTime", "hint", "starterCode", "solutionCode", "isPublished", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  'legacy-coding-' || "id", "slug", "text", COALESCE("description", "text"), "constraints", "difficulty", "tags",
  "estimatedTime", "hint", COALESCE("starterCode", '{}'::jsonb), "solutionCode", true, "id", "createdAt", "updatedAt"
FROM "PracticeQuestion"
WHERE "type" = 'coding' OR "category" = 'coding';

INSERT INTO "CodingTestCase" ("id", "questionId", "ordinal", "input", "expectedOutput", "isHidden")
SELECT
  'legacy-coding-case-' || p."id" || '-' || (testcase.ordinality - 1),
  'legacy-coding-' || p."id",
  testcase.ordinality,
  COALESCE(testcase.value->>'input', ''),
  COALESCE(testcase.value->>'expectedOutput', ''),
  COALESCE((testcase.value->>'isHidden')::boolean, false)
FROM "PracticeQuestion" p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p."testCases", '[]'::jsonb)) WITH ORDINALITY AS testcase(value, ordinality)
WHERE p."type" = 'coding' OR p."category" = 'coding';

INSERT INTO "CodingQuestion" (
  "id", "slug", "title", "description", "difficulty", "topics", "starterCode", "isPublished", "sortOrder", "updatedAt"
)
SELECT
  'demo-two-sum', 'two-sum', 'Two Sum',
  'Given an array of integers and a target, print the indices of the two numbers that add up to the target.',
  'easy', ARRAY['arrays', 'hash-map'],
  '{"javascript":"const [numsLine, targetLine] = input.trim().split(/\\n/);\nconst nums = JSON.parse(numsLine);\nconst target = Number(targetLine);\nconst seen = new Map();\nfor (let index = 0; index < nums.length; index += 1) {\n  const complement = target - nums[index];\n  if (seen.has(complement)) {\n    console.log(JSON.stringify([seen.get(complement), index]));\n    break;\n  }\n  seen.set(nums[index], index);\n}\n"}'::jsonb,
  true, 0, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "CodingQuestion" WHERE "isPublished" = true);

INSERT INTO "CodingTestCase" ("id", "questionId", "ordinal", "input", "expectedOutput", "isHidden")
SELECT 'demo-two-sum-case-1', 'demo-two-sum', 1, '[2,7,11,15]' || E'\n9', '[0,1]', false
WHERE EXISTS (SELECT 1 FROM "CodingQuestion" WHERE "id" = 'demo-two-sum')
  AND NOT EXISTS (SELECT 1 FROM "CodingTestCase" WHERE "questionId" = 'demo-two-sum');

CREATE UNIQUE INDEX "CodingQuestion_slug_key" ON "CodingQuestion"("slug");
CREATE INDEX "CodingQuestion_isPublished_sortOrder_createdAt_idx" ON "CodingQuestion"("isPublished", "sortOrder", "createdAt");
CREATE UNIQUE INDEX "CodingTestCase_questionId_ordinal_key" ON "CodingTestCase"("questionId", "ordinal");
CREATE UNIQUE INDEX "CodingSubmission_userId_clientSubmissionId_key" ON "CodingSubmission"("userId", "clientSubmissionId");
CREATE INDEX "CodingSubmission_userId_codingQuestionId_createdAt_idx" ON "CodingSubmission"("userId", "codingQuestionId", "createdAt");

ALTER TABLE "CodingTestCase" ADD CONSTRAINT "CodingTestCase_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingSolved" ADD CONSTRAINT "CodingSolved_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodingSolved" ADD CONSTRAINT "CodingSolved_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticeQuestion" DROP COLUMN "type",
DROP COLUMN "description",
DROP COLUMN "constraints",
DROP COLUMN "starterCode",
DROP COLUMN "testCases",
DROP COLUMN "solutionCode";
