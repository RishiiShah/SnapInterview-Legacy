import { readFile } from "fs/promises";
import { createHash, randomUUID } from "crypto";
import path from "path";

import { prisma } from "../src/lib/prisma";
import { dedupeByNormalizedQuestion, dropNearDuplicateQuestions, normalizeCorpusQuestion, parseCorpusTags } from "../src/lib/rag/corpus-normalization";
import { localEmbedder, toVectorLiteral } from "../src/lib/rag/embeddings";
import { mapHrCategory, mapSoftwareCategory, normalizeCategory } from "../src/lib/rag/taxonomy";
import { parseCsvRecords } from "../src/lib/csv";

const DEFAULT_SOFTWARE_CSV = path.join(process.cwd(), "src/data/corpus/technical-questions.csv");
const DEFAULT_HR_CSV = path.join(process.cwd(), "src/data/corpus/hr-questions.csv");
const EMBED_BATCH_SIZE = 64;

interface CorpusRecord {
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
  level: string | null;
  types: string[];
  roleTags: string[];
  keywords: string[];
  source: string;
  contentHash: string;
}

function hashQuestion(question: string): string {
  return createHash("sha256").update(normalizeCorpusQuestion(question)).digest("hex");
}

function decodeCsvBytes(raw: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return new TextDecoder("windows-1252").decode(raw);
  }
}

async function loadSoftwareRecords(csvPath: string): Promise<CorpusRecord[]> {
  const raw = await readFile(csvPath);
  const rows = parseCsvRecords(decodeCsvBytes(raw));
  const [header, ...body] = rows;

  const columnIndex = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const questionAt = columnIndex("question");
  const answerAt = columnIndex("answer");
  const categoryAt = columnIndex("category");
  const difficultyAt = columnIndex("difficulty");
  const levelAt = columnIndex("level");
  const tagsAt = columnIndex("tags");

  if (questionAt === -1 || categoryAt === -1) {
    throw new Error(`Unexpected CSV header: ${header.join(", ")}`);
  }

  return body.flatMap((row) => {
    const question = row[questionAt]?.trim();
    if (!question) {
      return [];
    }

    const category = normalizeCategory(row[categoryAt] ?? "");
    const { types, roleTags } = mapSoftwareCategory(category);
    const answer = row[answerAt]?.trim();

    return [
      {
        question,
        answer: answer || null,
        category,
        difficulty: row[difficultyAt]?.trim() || null,
        level: levelAt !== -1 ? (row[levelAt]?.trim() || null) : null,
        types,
        roleTags,
        keywords: tagsAt !== -1 ? parseCorpusTags(row[tagsAt]) : [],
        source: path.parse(csvPath).name,
        contentHash: hashQuestion(question),
      },
    ];
  });
}

async function loadHrRecords(csvPath: string): Promise<CorpusRecord[]> {
  const raw = await readFile(csvPath);
  const rows = parseCsvRecords(decodeCsvBytes(raw));
  const [header, ...body] = rows;

  const columnIndex = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const questionAt = columnIndex("question");
  const answerAt = columnIndex("answer");
  const categoryAt = columnIndex("category");
  const difficultyAt = columnIndex("difficulty");
  const levelAt = columnIndex("level");
  const tagsAt = columnIndex("tags");

  if (questionAt === -1 || categoryAt === -1) {
    throw new Error(`Unexpected CSV header: ${header.join(", ")}`);
  }

  return body.flatMap((row) => {
    const question = row[questionAt]?.trim();
    if (!question) {
      return [];
    }

    const category = row[categoryAt] ?? "";
    const { types, roleTags } = mapHrCategory(category);
    const answer = row[answerAt]?.trim();

    return [
      {
        question,
        answer: answer || null,
        category,
        difficulty: row[difficultyAt]?.trim() || null,
        level: levelAt !== -1 ? (row[levelAt]?.trim() || null) : null,
        types,
        roleTags,
        keywords: tagsAt !== -1 ? parseCorpusTags(row[tagsAt]) : [],
        source: path.parse(csvPath).name,
        contentHash: hashQuestion(question),
      },
    ];
  });
}

async function upsert(record: CorpusRecord, embedding: number[]): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "QuestionCorpus" (
      "id", "question", "answer", "category", "difficulty", "level",
      "types", "roleTags", "keywords", "source", "contentHash",
      "embedding", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${record.question}, ${record.answer}, ${record.category}, ${record.difficulty}, ${record.level},
      ${record.types}::text[], ${record.roleTags}::text[], ${record.keywords}::text[],
      ${record.source}, ${record.contentHash},
      ${toVectorLiteral(embedding)}::extensions.vector, NOW(), NOW()
    )
    ON CONFLICT ("contentHash") DO UPDATE SET
      "question"   = EXCLUDED."question",
      "answer"     = COALESCE(EXCLUDED."answer", "QuestionCorpus"."answer"),
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

  if (source === "all" || source === "software") {
    const software = await loadSoftwareRecords(softwareCsv);
    console.log(`software: ${software.length} rows read from ${softwareCsv}`);
    records.push(...software);
  }

  if (source === "all" || source === "hr") {
    const hr = await loadHrRecords(hrCsv);
    console.log(`hr:       ${hr.length} rows read from ${hrCsv}`);
    records.push(...hr);
  }

  if (records.length === 0) {
    throw new Error(`No records loaded (--source=${source})`);
  }

  const { unique: exactUnique, dropped } = dedupeByNormalizedQuestion(records);
  const { unique, dropped: nearDropped } = dropNearDuplicateQuestions(exactUnique);
  console.log(`\ndeduped:  ${exactUnique.length} unique (${dropped} exact duplicates dropped)`);
  console.log(`near-dupe: ${unique.length} kept (${nearDropped} near-duplicates dropped)`);

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
  } else {
    console.log("writing...");
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

  console.log(dryRun ? `\nDry run: ${unique.length} rows ready` : `\nDone: ${written} rows upserted`);
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
