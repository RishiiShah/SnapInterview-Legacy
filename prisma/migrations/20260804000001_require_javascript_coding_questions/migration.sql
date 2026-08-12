-- The browser runner executes JavaScript only. Keep legacy Python/C++-only
-- questions out of the public catalog until an admin supplies JavaScript source.
UPDATE "CodingQuestion"
SET "isPublished" = false,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "isPublished" = true
  AND (
    jsonb_typeof("starterCode") <> 'object'
    OR NULLIF(BTRIM("starterCode"->>'javascript'), '') IS NULL
  );
