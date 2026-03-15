UPDATE "InterviewSession"
SET "evaluation" = NULL
WHERE "evaluation" IS NOT NULL
  AND (
    jsonb_typeof("evaluation") <> 'object'
    OR jsonb_typeof("evaluation"->'score') <> 'number'
    OR jsonb_typeof("evaluation"->'feedback') <> 'string'
    OR jsonb_typeof("evaluation"->'strengths') <> 'array'
    OR jsonb_typeof("evaluation"->'areasForImprovement') <> 'array'
    OR jsonb_array_length(COALESCE("evaluation"->'strengths', '[]'::jsonb)) = 0
    OR jsonb_array_length(COALESCE("evaluation"->'areasForImprovement', '[]'::jsonb)) = 0
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE("evaluation"->'strengths', '[]'::jsonb)) AS item(value)
      WHERE jsonb_typeof(item.value) <> 'string'
    )
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE("evaluation"->'areasForImprovement', '[]'::jsonb)) AS item(value)
      WHERE jsonb_typeof(item.value) <> 'string'
    )
  );
