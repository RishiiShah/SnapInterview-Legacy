-- Hybrid retrieval searches these fields on every corpus lookup. Without this
-- expression index, PostgreSQL scans the full active corpus for each sparse branch.
CREATE INDEX "QuestionCorpus_search_idx"
ON "QuestionCorpus" USING GIN (
  to_tsvector(
    'english'::regconfig,
    "question" || ' ' || COALESCE("answer", '') || ' ' || "category"
  )
)
WHERE "isActive" = true;
