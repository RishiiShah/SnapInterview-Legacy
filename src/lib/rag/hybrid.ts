import type { PrismaClient } from "@/generated/prisma/client";
import { logger } from "@/utils/logger";
import { extractKeyTechnicalTerms } from "./chunker";
import { expandSynonyms } from "./synonyms";

export interface HybridCandidateRow {
  id: string;
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
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
}

const DEFAULT_POOL_LIMIT = 40;
const DEFAULT_DENSE_WEIGHT = 0.6;
const DEFAULT_SPARSE_WEIGHT = 0.4;
const DEFAULT_RRF_K = 60;

/**
 * Builds a clean search string for PostgreSQL plainto_tsquery from raw text.
 * Expands known technical abbreviations and acronyms with domain synonyms.
 */
export function buildTsQueryString(rawText: string): string {
  const expandedText = expandSynonyms(rawText);
  const terms = extractKeyTechnicalTerms(expandedText);
  if (terms.length === 0) {
    return rawText.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  }
  return terms.slice(0, 20).join(" ");
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
  } = params;

  const typesParam = interviewType ? [interviewType] : [];
  const cleanSparseQuery = buildTsQueryString(sparseKeywords);

  // 1. Parallel execution of Dense Vector Search & Sparse FTS
  const [denseResults, sparseResults] = await Promise.all([
    // Dense Vector Search
    prisma.$queryRaw<
      Array<{
        id: string;
        question: string;
        answer: string | null;
        category: string;
        difficulty: string | null;
        roleTags: string[];
        types: string[];
        similarity: number;
        embedding: string;
      }>
    >`
      SELECT "id", "question", "answer", "category", "difficulty", "roleTags", "types",
             (1 - ("embedding" OPERATOR(extensions.<=>) ${queryVectorLiteral}::extensions.vector))
               + CASE WHEN ${roleSlug} = ANY("roleTags") THEN 0.1::double precision ELSE 0 END AS similarity,
             "embedding"::text AS embedding
      FROM "QuestionCorpus"
      WHERE "embedding" IS NOT NULL
        AND ("types" && ${typesParam}::text[] OR cardinality("types") = 0)
      ORDER BY similarity DESC
      LIMIT ${poolLimit}
    `.catch((err) => {
      logger.warn("Dense retrieval query failed", { error: err });
      return [];
    }),

    // Sparse Full-Text Search
    cleanSparseQuery.trim().length > 0
      ? prisma.$queryRaw<
          Array<{
            id: string;
            question: string;
            answer: string | null;
            category: string;
            difficulty: string | null;
            roleTags: string[];
            types: string[];
            rank_score: number;
            embedding: string;
          }>
        >`
          SELECT "id", "question", "answer", "category", "difficulty", "roleTags", "types",
                 ts_rank(
                   to_tsvector('english', "question" || ' ' || COALESCE("answer", '') || ' ' || "category" || ' ' || array_to_string("keywords", ' ')),
                   plainto_tsquery('english', ${cleanSparseQuery})
                 ) AS rank_score,
                 "embedding"::text AS embedding
          FROM "QuestionCorpus"
          WHERE ("types" && ${typesParam}::text[] OR cardinality("types") = 0)
            AND to_tsvector('english', "question" || ' ' || COALESCE("answer", '') || ' ' || "category" || ' ' || array_to_string("keywords", ' '))
                @@ plainto_tsquery('english', ${cleanSparseQuery})
          ORDER BY rank_score DESC
          LIMIT ${poolLimit}
        `.catch((err) => {
          logger.warn("Sparse retrieval query failed", { error: err });
          return [];
        })
      : Promise.resolve([]),
  ]);

  // 2. Compute Reciprocal Rank Fusion (RRF)
  const candidateMap = new Map<
    string,
    {
      row: {
        id: string;
        question: string;
        answer: string | null;
        category: string;
        difficulty: string | null;
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
        question: item.question,
        answer: item.answer,
        category: item.category,
        difficulty: item.difficulty,
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
          question: item.question,
          answer: item.answer,
          category: item.category,
          difficulty: item.difficulty,
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
