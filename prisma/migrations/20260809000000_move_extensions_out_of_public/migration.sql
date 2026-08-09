-- Supabase security advisor 0014: extensions should not live in `public`.
-- See https://supabase.github.io/splinter/0014_extension_in_public/

CREATE SCHEMA IF NOT EXISTS extensions;

-- ─── pg_trgm (trigram search indexes) ───────────────────────────────────────

DO $$
DECLARE
  trgm_schema text;
BEGIN
  SELECT n.nspname
  INTO trgm_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  IF trgm_schema IS NULL THEN
    CREATE EXTENSION pg_trgm SCHEMA extensions;
  ELSIF trgm_schema = 'public' THEN
    DROP INDEX IF EXISTS "InterviewSession_role_trgm_idx";
    DROP INDEX IF EXISTS "InterviewSession_company_trgm_idx";
    DROP INDEX IF EXISTS "InterviewSession_type_trgm_idx";
    DROP INDEX IF EXISTS "PracticeQuestion_text_trgm_idx";
    DROP INDEX IF EXISTS "PracticeQuestion_category_trgm_idx";
    DROP INDEX IF EXISTS "CodingQuestion_title_trgm_idx";
    DROP INDEX IF EXISTS "CodingQuestion_description_trgm_idx";

    BEGIN
      ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    EXCEPTION
      WHEN insufficient_privilege OR SQLSTATE '42501' THEN
        DROP EXTENSION pg_trgm;
        CREATE EXTENSION pg_trgm SCHEMA extensions;
    END;

    SELECT n.nspname
    INTO trgm_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm';

    IF trgm_schema = 'public' THEN
      DROP EXTENSION pg_trgm;
      CREATE EXTENSION pg_trgm SCHEMA extensions;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) THEN
    CREATE INDEX IF NOT EXISTS "InterviewSession_role_trgm_idx"
      ON "InterviewSession" USING GIN ("role" extensions.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "InterviewSession_company_trgm_idx"
      ON "InterviewSession" USING GIN ("company" extensions.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "InterviewSession_type_trgm_idx"
      ON "InterviewSession" USING GIN ("type" extensions.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "PracticeQuestion_text_trgm_idx"
      ON "PracticeQuestion" USING GIN ("text" extensions.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "PracticeQuestion_category_trgm_idx"
      ON "PracticeQuestion" USING GIN ("category" extensions.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "CodingQuestion_title_trgm_idx"
      ON "CodingQuestion" USING GIN ("title" extensions.gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS "CodingQuestion_description_trgm_idx"
      ON "CodingQuestion" USING GIN ("description" extensions.gin_trgm_ops);
  END IF;
END $$;

-- ─── vector (QuestionCorpus embeddings) — never DROP; data loss ─────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION vector SET SCHEMA extensions;
  ELSIF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    CREATE EXTENSION vector SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR SQLSTATE '42501' THEN
    RAISE NOTICE 'Could not relocate vector extension; enable it in the extensions schema from the Supabase dashboard.';
END $$;

-- ─── pgcrypto (gen_random_uuid in historical migrations) ────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto' AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION pgcrypto SET SCHEMA extensions;
  ELSIF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    CREATE EXTENSION pgcrypto SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR SQLSTATE '42501' THEN
    RAISE NOTICE 'Could not relocate pgcrypto extension; enable it in the extensions schema from the Supabase dashboard.';
END $$;
