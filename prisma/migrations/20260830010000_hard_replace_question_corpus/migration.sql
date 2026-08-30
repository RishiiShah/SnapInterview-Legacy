DROP INDEX IF EXISTS "QuestionCorpus_active_source_sourceId_key";
DROP INDEX IF EXISTS "QuestionCorpus_isActive_idx";
DROP INDEX IF EXISTS "QuestionCorpus_search_idx";

ALTER TABLE "QuestionCorpus" DROP COLUMN "isActive";

CREATE UNIQUE INDEX "QuestionCorpus_source_sourceId_key"
  ON "QuestionCorpus"("source", "sourceId")
  WHERE "sourceId" IS NOT NULL;

CREATE INDEX "QuestionCorpus_search_idx"
ON "QuestionCorpus" USING GIN (
  to_tsvector(
    'english'::regconfig,
    "question" || ' ' || COALESCE("answer", '') || ' ' || "category"
  )
);
