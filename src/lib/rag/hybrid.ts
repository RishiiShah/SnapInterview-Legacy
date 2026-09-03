import type { PrismaClient } from "@/generated/prisma/client";
import { logger } from "@/utils/logger";
import { extractKeyTechnicalTerms } from "./chunker";
import { expandSynonyms } from "./synonyms";

export interface HybridCandidateRow {
  id: string;
  sourceId?: string | null;
  question: string;
  answer: string | null;
  commonMistakes?: string | null;
  category: string;
  difficulty: string | null;
  level: string | null;
  roleTags: string[];
  types?: string[];
  embedding: string | null;
  similarity?: number;
  denseRank?: number;
  sparseRank?: number;
  rrfScore: number;
}

export interface HybridSearchParams {
  queryVectorLiteral: string;
  sparseKeywords: string;
  roleSlug: string;
  interviewType: string;
  poolLimit?: number;
  denseWeight?: number;
  sparseWeight?: number;
  rrfK?: number;
  matchAnySparseTerm?: boolean;
  /**
   * When provided, the dense search adds a `WHERE category = ANY(...)` filter.
   * Use only for strict-category technical rounds with ≥3 preferred categories.
   * A fallback re-query without the filter fires if too few results come back.
   */
  preferredCategories?: string[];
}

const DEFAULT_POOL_LIMIT = 40;
const DEFAULT_DENSE_WEIGHT = 0.6;
const DEFAULT_SPARSE_WEIGHT = 0.4;
const DEFAULT_RRF_K = 60;

/**
 * Builds a clean PostgreSQL web-search query from raw text.
 *
 * Normal conversational retrieval stays conjunctive. Focused gap-fill can opt
 * into OR semantics so any explicitly missing topic can enter the candidate pool.
 */
export function buildTsQueryString(rawText: string, matchAnyTerm = false): string {
  const expandedText = expandSynonyms(rawText);
  const terms = extractKeyTechnicalTerms(expandedText);
  if (terms.length === 0) {
    return rawText.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  }
  return terms.slice(0, 20).join(matchAnyTerm ? " OR " : " ");
}

/**
 * Executes hybrid dense vector + sparse full-text retrieval in PostgreSQL with Reciprocal Rank Fusion (RRF).
 */
export async function executeHybridRetrieval(
  prisma: PrismaClient,
  params: HybridSearchParams
): Promise<HybridCandidateRow[]> {
  const {
    queryVectorLiteral,
    sparseKeywords,
    roleSlug,
    interviewType,
    poolLimit = DEFAULT_POOL_LIMIT,
    denseWeight = DEFAULT_DENSE_WEIGHT,
    sparseWeight = DEFAULT_SPARSE_WEIGHT,
    rrfK = DEFAULT_RRF_K,
    matchAnySparseTerm = false,
    preferredCategories,
  } = params;

  const typesParam = interviewType ? [interviewType] : [];
  const cleanSparseQuery = buildTsQueryString(sparseKeywords, matchAnySparseTerm);

  // Decide whether to apply a SQL-level category filter on the dense branch.
  // Only filter when the caller provides ≥3 preferred categories (enough to
  // avoid starving the pool). If the filtered query returns too few results,
  // re-run without the filter as a fallback.
  const useCategoryFilter = (preferredCategories?.length ?? 0) >= 3;
  const categoryFilterParam = preferredCategories ?? [];

  type DenseRow = {
    id: string;
    sourceId: string | null;
    question: string;
    answer: string | null;
    commonMistakes: string | null;
    category: string;
    difficulty: string | null;
    level: string | null;
    roleTags: string[];
    types: string[];
    similarity: number;
    embedding: string;
  };

  async function denseSearch(withCategoryFilter: boolean): Promise<DenseRow[]> {
    if (denseWeight <= 0) return [];
    try {
      if (withCategoryFilter) {
        return await prisma.$queryRaw<DenseRow[]>`
          SELECT "id", "sourceId", "question", "answer", "commonMistakes", "category", "difficulty", "level", "roleTags", "types",
                 (1 - ("embedding" OPERATOR(extensions.<=>) ${queryVectorLiteral}::extensions.vector)) AS similarity,
                 "embedding"::text AS embedding
          FROM "QuestionCorpus"
          WHERE "embedding" IS NOT NULL
            AND ("types" && ${typesParam}::text[] OR cardinality("types") = 0)
            AND "category" = ANY(${categoryFilterParam}::text[])
          ORDER BY similarity DESC
          LIMIT ${poolLimit}
        `;
      }
      return await prisma.$queryRaw<DenseRow[]>`
        SELECT "id", "sourceId", "question", "answer", "commonMistakes", "category", "difficulty", "level", "roleTags", "types",
               (1 - ("embedding" OPERATOR(extensions.<=>) ${queryVectorLiteral}::extensions.vector)) AS similarity,
               "embedding"::text AS embedding
        FROM "QuestionCorpus"
        WHERE "embedding" IS NOT NULL
          AND ("types" && ${typesParam}::text[] OR cardinality("types") = 0)
        ORDER BY similarity DESC
        LIMIT ${poolLimit}
      `;
    } catch (err) {
      logger.warn("Dense retrieval query failed", { error: err });
      return [];
    }
  }

  // 1. Parallel execution of Dense Vector Search & Sparse FTS
  const [initialDenseResults, sparseResults] = await Promise.all([
    denseSearch(useCategoryFilter),

    // Sparse Full-Text Search
    cleanSparseQuery.trim().length > 0
      ? prisma.$queryRaw<
          Array<{
            id: string;
            sourceId: string | null;
            question: string;
            answer: string | null;
            commonMistakes: string | null;
            category: string;
            difficulty: string | null;
  level: string | null;
            roleTags: string[];
            types: string[];
            rank_score: number;
            embedding: string;
          }>
        >`
          SELECT "id", "sourceId", "question", "answer", "commonMistakes", "category", "difficulty", "level", "roleTags", "types",
                 ts_rank(
                   to_tsvector('english', "question" || ' ' || COALESCE("answer", '') || ' ' || "category"),
                   websearch_to_tsquery('english', ${cleanSparseQuery})
                 ) AS rank_score,
                 "embedding"::text AS embedding
          FROM "QuestionCorpus"
          WHERE ("types" && ${typesParam}::text[] OR cardinality("types") = 0)
            AND to_tsvector('english', "question" || ' ' || COALESCE("answer", '') || ' ' || "category")
                @@ websearch_to_tsquery('english', ${cleanSparseQuery})
          ORDER BY rank_score DESC
          LIMIT ${poolLimit}
        `.catch((err) => {
          logger.warn("Sparse retrieval query failed", { error: err });
          return [];
        })
      : Promise.resolve([]),
  ]);

  // Fallback: if the category-filtered dense search starved the pool, re-query
  // without the filter so we don't lose recall.
  const MIN_CATEGORY_RESULTS = Math.ceil(poolLimit / 2);
  const denseResults =
    useCategoryFilter && initialDenseResults.length < MIN_CATEGORY_RESULTS
      ? await denseSearch(false)
      : initialDenseResults;

  // 2. Compute Reciprocal Rank Fusion (RRF)
  const candidateMap = new Map<
    string,
    {
      row: {
        id: string;
        sourceId: string | null;
        question: string;
        answer: string | null;
        commonMistakes: string | null;
        category: string;
        difficulty: string | null;
  level: string | null;
        roleTags: string[];
        types: string[];
        embedding: string | null;
      };
      denseRank?: number;
      sparseRank?: number;
      similarity?: number;
      rrfScore: number;
    }
  >();

  // Ingest dense ranks (1-indexed)
  for (let i = 0; i < denseResults.length; i++) {
    const item = denseResults[i];
    const rank = i + 1;
    const rrfContribution = denseWeight / (rrfK + rank);

    candidateMap.set(item.id, {
      row: {
        id: item.id,
        sourceId: item.sourceId,
        question: item.question,
        answer: item.answer,
        commonMistakes: item.commonMistakes,
        category: item.category,
        difficulty: item.difficulty,
          level: item.level,
        roleTags: item.roleTags,
        types: item.types,
        embedding: item.embedding,
      },
      denseRank: rank,
      similarity: item.similarity,
      rrfScore: rrfContribution,
    });
  }

  // Ingest sparse ranks (1-indexed)
  for (let i = 0; i < sparseResults.length; i++) {
    const item = sparseResults[i];
    const rank = i + 1;
    const rrfContribution = sparseWeight / (rrfK + rank);

    const existing = candidateMap.get(item.id);
    if (existing) {
      existing.sparseRank = rank;
      existing.rrfScore += rrfContribution;
    } else {
      candidateMap.set(item.id, {
        row: {
          id: item.id,
          sourceId: item.sourceId,
          question: item.question,
          answer: item.answer,
          commonMistakes: item.commonMistakes,
          category: item.category,
          difficulty: item.difficulty,
          level: item.level,
          roleTags: item.roleTags,
          types: item.types,
          embedding: item.embedding,
        },
        sparseRank: rank,
        rrfScore: rrfContribution,
      });
    }
  }

  // 3. Sort candidates by final RRF score descending
  const fusedCandidates: HybridCandidateRow[] = Array.from(candidateMap.values())
    .map(({ row, denseRank, sparseRank, similarity, rrfScore }) => ({
      ...row,
      denseRank,
      sparseRank,
      similarity,
      rrfScore: Number(rrfScore.toFixed(5)),
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, poolLimit);

  return fusedCandidates;
}
