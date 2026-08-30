import { readFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

import { prisma } from "../src/lib/prisma";
import { localEmbedder, toVectorLiteral } from "../src/lib/rag/embeddings";
import {
  toCorpusRecord,
  type CorpusRecord,
} from "../src/lib/rag/corpus-ingest-record";
import {
  assertSafeCorpusSync,
  assertCorpusSourceCounts,
  assertValidCorpusSource,
  parseCorpusSource,
  type CorpusSourceKind,
  type CorpusSourceRecord,
} from "../src/lib/rag/corpus-quality";
import type { Prisma } from "../src/generated/prisma/client";

const DEFAULT_SOFTWARE_CSV = path.join(process.cwd(), "src/data/corpus/technical-questions.csv");
const DEFAULT_HR_CSV = path.join(process.cwd(), "src/data/corpus/hr-questions.csv");
const EMBED_BATCH_SIZE = 64;

function decodeCsvBytes(raw: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return new TextDecoder("windows-1252").decode(raw);
  }
}

async function loadSourceRecords(
  csvPath: string,
  sourceKind: CorpusSourceKind
): Promise<{ sourceRecords: CorpusSourceRecord[]; corpusRecords: CorpusRecord[] }> {
  const raw = await readFile(csvPath);
  const sourceRecords = parseCorpusSource(decodeCsvBytes(raw), sourceKind);
  assertValidCorpusSource(sourceRecords);
  return {
    sourceRecords,
    corpusRecords: sourceRecords.map((record) =>
      toCorpusRecord(record, path.parse(csvPath).name)
    ),
  };
}

async function upsert(
  record: CorpusRecord,
  embedding: number[],
  client: Pick<Prisma.TransactionClient, "$executeRaw"> = prisma
): Promise<void> {
  await client.$executeRaw`
    INSERT INTO "QuestionCorpus" (
      "id", "sourceId", "question", "answer", "commonMistakes", "category", "difficulty", "level",
      "types", "roleTags", "keywords", "source", "contentHash",
      "embedding", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${record.sourceId}, ${record.question}, ${record.answer}, ${record.commonMistakes}, ${record.category}, ${record.difficulty}, ${record.level},
      ${record.types}::text[], ${record.roleTags}::text[], ${record.keywords}::text[],
      ${record.source}, ${record.contentHash},
      ${toVectorLiteral(embedding)}::extensions.vector, NOW(), NOW()
    )
    ON CONFLICT ("contentHash") DO UPDATE SET
      "question"   = EXCLUDED."question",
      "sourceId"   = EXCLUDED."sourceId",
      "answer"     = COALESCE(EXCLUDED."answer", "QuestionCorpus"."answer"),
      "commonMistakes" = COALESCE(EXCLUDED."commonMistakes", "QuestionCorpus"."commonMistakes"),
      "category"   = EXCLUDED."category",
      "difficulty" = EXCLUDED."difficulty",
      "level"      = EXCLUDED."level",
      "types"      = EXCLUDED."types",
      "roleTags"   = EXCLUDED."roleTags",
      "keywords"   = EXCLUDED."keywords",
      "source"     = EXCLUDED."source",
      "embedding"  = EXCLUDED."embedding",
      "updatedAt"  = NOW()
  `;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

  const source = flag("source") ?? "all";
  const softwareCsv = flag("software-csv") ?? DEFAULT_SOFTWARE_CSV;
  const hrCsv = flag("hr-csv") ?? DEFAULT_HR_CSV;
  const dryRun = args.includes("--dry-run");

  const records: CorpusRecord[] = [];
  const sourceRecords: CorpusSourceRecord[] = [];

  if (source === "all" || source === "software") {
    const software = await loadSourceRecords(softwareCsv, "technical");
    console.log(`software: ${software.corpusRecords.length} rows read from ${softwareCsv}`);
    sourceRecords.push(...software.sourceRecords);
    records.push(...software.corpusRecords);
  }

  if (source === "all" || source === "hr") {
    const hr = await loadSourceRecords(hrCsv, "hr");
    console.log(`hr:       ${hr.corpusRecords.length} rows read from ${hrCsv}`);
    sourceRecords.push(...hr.sourceRecords);
    records.push(...hr.corpusRecords);
  }

  if (records.length === 0) {
    throw new Error(`No records loaded (--source=${source})`);
  }

  if (source === "all") assertCorpusSourceCounts(sourceRecords);
  const unique = records;
  console.log(`\nvalidated: ${unique.length} unique source rows`);

  console.log("embedding...");
  const embeddings: number[][] = [];
  for (let i = 0; i < unique.length; i += EMBED_BATCH_SIZE) {
    const batch = unique.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((r) => (r.answer ? `${r.question}\n${r.answer}` : r.question));
    embeddings.push(...(await localEmbedder.embed(texts)));
    console.log(`  ${Math.min(i + EMBED_BATCH_SIZE, unique.length)}/${unique.length}`);
  }

  let written = 0;
  if (dryRun) {
    console.log("dry run — skipping database writes");
  } else if (source === "all") {
    const retrievedQuestionCount = await prisma.retrievedQuestion.count();
    assertSafeCorpusSync({
      sourceRecords,
      stagedRecords: sourceRecords.map((record, index) => ({
        sourceKind: record.sourceKind,
        sourceId: record.sourceId,
        contentHash: record.contentHash,
        embedding: embeddings[index],
      })),
    });
    console.log(
      `replacing complete corpus (${retrievedQuestionCount} old retrieval-history links will be deleted)...`
    );
    await prisma.$transaction(async (transaction) => {
      await transaction.questionCorpus.deleteMany();
      for (let index = 0; index < unique.length; index += 1) {
        await upsert(unique[index], embeddings[index], transaction);
        written += 1;
      }
    }, { isolationLevel: "Serializable", timeout: 600_000 });
  } else {
    console.log("upserting custom source without removing unrelated rows...");
    for (let i = 0; i < unique.length; i++) {
      await upsert(unique[i], embeddings[i]);
      written++;
    }
  }

  const bySource = new Map<string, number>();
  const byType = new Map<string, number>();
  let roleAgnostic = 0;
  let withAnswer = 0;

  for (const record of unique) {
    bySource.set(record.source, (bySource.get(record.source) ?? 0) + 1);
    for (const type of record.types) {
      byType.set(type, (byType.get(type) ?? 0) + 1);
    }
    if (record.roleTags.length === 0) roleAgnostic++;
    if (record.answer) withAnswer++;
  }

  console.log(dryRun ? `\nDry run: ${unique.length} rows ready` : `\nDone: ${written} rows written`);
  for (const [name, count] of bySource) {
    console.log(`  source ${name}: ${count}`);
  }
  for (const [name, count] of byType) {
    console.log(`  type   ${name}: ${count}`);
  }
  console.log(`  with reference answer: ${withAnswer}`);
  console.log(`  role-agnostic:         ${roleAgnostic}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
