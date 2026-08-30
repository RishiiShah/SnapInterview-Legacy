ALTER TABLE "QuestionCorpus"
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "commonMistakes" TEXT;

CREATE INDEX "QuestionCorpus_isActive_idx" ON "QuestionCorpus"("isActive");

-- Only the current corpus needs unique source numbers. Retired rows retain their
-- original number so historical interview references remain understandable.
CREATE UNIQUE INDEX "QuestionCorpus_active_source_sourceId_key"
  ON "QuestionCorpus"("source", "sourceId")
  WHERE "isActive" = true AND "sourceId" IS NOT NULL;
