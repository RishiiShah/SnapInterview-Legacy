-- pgvector ships with Supabase but is not enabled by default.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "QuestionCorpus" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" TEXT,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "roleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCorpus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCorpus_contentHash_key" ON "QuestionCorpus"("contentHash");

-- CreateIndex
CREATE INDEX "QuestionCorpus_source_idx" ON "QuestionCorpus"("source");

-- CreateIndex
CREATE INDEX "QuestionCorpus_category_idx" ON "QuestionCorpus"("category");

-- CreateIndex
CREATE INDEX "QuestionCorpus_types_idx" ON "QuestionCorpus" USING GIN ("types");

-- CreateIndex
CREATE INDEX "QuestionCorpus_roleTags_idx" ON "QuestionCorpus" USING GIN ("roleTags");

-- No ANN index on "embedding" by design. At corpus sizes below ~10k rows a
-- sequential scan beats HNSW, and HNSW on a tiny table degrades recall.
-- Add this once the corpus grows past that:
--   CREATE INDEX "QuestionCorpus_embedding_idx" ON "QuestionCorpus"
--     USING hnsw ("embedding" vector_cosine_ops);
