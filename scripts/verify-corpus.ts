/**
 * Verifies the ingested corpus end to end, against the real database.
 *
 * This is the check that JavaScript-side cosine similarity cannot give you: it
 * confirms the vectors survived the round trip into pgvector and that the `<=>`
 * operator ranks them sensibly through Supabase.
 *
 * Usage:
 *   npx tsx scripts/verify-corpus.ts
 */
import { prisma } from "../src/lib/prisma";
import { localEmbedder, toVectorLiteral } from "../src/lib/rag/embeddings";
import { CORPUS_SOURCES } from "../src/lib/rag/taxonomy";

const PROBES = [
  {
    label: "React dev, resume mentions Redux, last answer on re-renders",
    query: "React Developer. Resume: Redux, hooks, performance tuning. Last answer discussed re-render optimization.",
    types: ["domain-role"],
  },
  {
    label: "DevOps, JD requires Kubernetes and CI/CD",
    query: "DevOps Engineer. Job description requires Kubernetes, CI/CD pipelines, infrastructure as code.",
    types: ["domain-role", "system-design"],
  },
  {
    label: "Behavioural, shallow answer on a team disagreement",
    query: "Behavioural round. Candidate gave a shallow answer about a disagreement with a teammate.",
    types: ["behavioral-leadership"],
  },
];

interface CountRow {
  source: string;
  total: bigint;
  embedded: bigint;
}

interface MatchRow {
  question: string;
  category: string;
  source: string;
  similarity: number;
}

async function main() {
  let failures = 0;
  const fail = (message: string) => {
    console.error(`  FAIL: ${message}`);
    failures++;
  };

  // ── 1. Rows landed, every row embedded ──────────────────────────────────
  const counts = await prisma.$queryRaw<CountRow[]>`
    SELECT "source",
           COUNT(*)                                        AS total,
           COUNT(*) FILTER (WHERE "embedding" IS NOT NULL) AS embedded
    FROM "QuestionCorpus"
    GROUP BY "source"
    ORDER BY "source"
  `;

  console.log("Row counts by source:");
  if (counts.length === 0) {
    fail("QuestionCorpus is empty — did `npm run corpus:ingest` run?");
  }

  for (const row of counts) {
    console.log(`  ${row.source}: ${row.total} rows, ${row.embedded} embedded`);
    if (row.total !== row.embedded) {
      fail(`${row.source} has ${row.total - row.embedded} rows without an embedding`);
    }
  }

  const expected: Record<string, number> = {
    [CORPUS_SOURCES.software]: 174,
    [CORPUS_SOURCES.hr]: 40,
  };
  for (const [source, count] of Object.entries(expected)) {
    const actual = Number(counts.find((r) => r.source === source)?.total ?? 0);
    if (actual !== count) {
      fail(`expected ${count} rows for ${source}, found ${actual}`);
    }
  }

  // ── 2. Stored vectors have the dimensions the column promises ───────────
  const [dims] = await prisma.$queryRaw<{ dims: number }[]>`
    SELECT vector_dims("embedding") AS dims
    FROM "QuestionCorpus"
    WHERE "embedding" IS NOT NULL
    LIMIT 1
  `;
  console.log(`\nStored vector dimensions: ${dims?.dims}`);
  if (dims?.dims !== localEmbedder.dimensions) {
    fail(`expected ${localEmbedder.dimensions} dimensions, found ${dims?.dims}`);
  }

  // ── 3. pgvector ranking, executed in Postgres ───────────────────────────
  for (const probe of PROBES) {
    const [vector] = await localEmbedder.embed([probe.query]);
    const literal = toVectorLiteral(vector);

    const matches = await prisma.$queryRaw<MatchRow[]>`
      SELECT "question", "category", "source",
             1 - ("embedding" <=> ${literal}::vector) AS similarity
      FROM "QuestionCorpus"
      WHERE "embedding" IS NOT NULL
        AND "types" && ${probe.types}::text[]
      ORDER BY "embedding" <=> ${literal}::vector
      LIMIT 5
    `;

    console.log(`\n${probe.label}`);
    for (const match of matches) {
      console.log(`  ${match.similarity.toFixed(3)}  [${match.category}] ${match.question.slice(0, 66)}`);
    }

    if (matches.length === 0) {
      fail(`no matches for "${probe.label}" — check the types filter`);
      continue;
    }
    // Ordering, not an absolute threshold: MiniLM cosine values are compressed,
    // so what matters is that the top hit beats the tail.
    if (matches[0].similarity <= matches[matches.length - 1].similarity) {
      fail(`ranking is flat for "${probe.label}" — vectors may not have round-tripped`);
    }
  }

  // ── 4. Exclusion filter — the mechanism the diversity fix depends on ────
  const [firstProbeVector] = await localEmbedder.embed([PROBES[0].query]);
  const literal = toVectorLiteral(firstProbeVector);

  const unfiltered = await prisma.$queryRaw<MatchRow[]>`
    SELECT "question" FROM "QuestionCorpus"
    WHERE "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${literal}::vector
    LIMIT 1
  `;
  const excluded = await prisma.$queryRaw<MatchRow[]>`
    SELECT "question" FROM "QuestionCorpus"
    WHERE "embedding" IS NOT NULL
      AND "question" <> ALL(${unfiltered.map((r) => r.question)}::text[])
    ORDER BY "embedding" <=> ${literal}::vector
    LIMIT 1
  `;

  console.log("\nExclusion filter:");
  console.log(`  top hit:            ${unfiltered[0]?.question.slice(0, 60)}`);
  console.log(`  with top excluded:  ${excluded[0]?.question.slice(0, 60)}`);
  if (!excluded[0] || excluded[0].question === unfiltered[0]?.question) {
    fail("exclusion filter did not remove the excluded question");
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  if (failures > 0) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
