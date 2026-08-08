/**
 * Ingests the question corpora into `QuestionCorpus`, embedding each question
 * so retrieval only ever has to embed the (short) query at runtime.
 *
 * Idempotent: rows are keyed on `contentHash`, so re-running updates in place.
 *
 * Usage:
 *   npx tsx scripts/ingest-questions.ts                       # both sources
 *   npx tsx scripts/ingest-questions.ts --source=software
 *   npx tsx scripts/ingest-questions.ts --software-csv=/path/to/questions.csv
 */
import { createHash, randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { localEmbedder, toVectorLiteral } from "../src/lib/rag/embeddings";
import { CORPUS_SOURCES, mapHrCategory, mapSoftwareCategory, normalizeCategory } from "../src/lib/rag/taxonomy";

const HR_CORPUS_PATH = path.join(process.cwd(), "src/data/corpus/hr-questions.json");
const DEFAULT_SOFTWARE_CSV = path.join(process.cwd(), "src/data/corpus/software-questions.csv");
const EMBED_BATCH_SIZE = 64;

interface CorpusRecord {
  question: string;
  answer: string | null;
  category: string;
  difficulty: string | null;
  types: string[];
  roleTags: string[];
  keywords: string[];
  source: string;
  contentHash: string;
}

/**
 * The dedupe key. Exact-match on normalized text only: measured against the
 * software corpus, every lexical near-match (Jaccard 0.6-0.99) was a shared
 * phrasing template between genuinely different questions -- "What is OAuth,
 * and how does it work?" vs "What is Docker, and how does it work?" -- so
 * fuzzy deduplication would delete real content.
 */
function hashQuestion(question: string): string {
  const normalized = question
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex");
}

/** Minimal RFC 4180 parser -- enough for these files, no dependency needed. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/**
 * The original download is windows-1252, not UTF-8 (it carries 0x97 em-dashes),
 * while the committed copy is UTF-8. Decoding either one wrongly yields mojibake
 * that would end up verbatim in an interview prompt, so detect rather than
 * assume: strict UTF-8 first, windows-1252 only when that rejects the bytes.
 */
function decodeCsvBytes(raw: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return new TextDecoder("windows-1252").decode(raw);
  }
}

async function loadSoftwareRecords(csvPath: string): Promise<CorpusRecord[]> {
  const raw = await readFile(csvPath);
  const rows = parseCsv(decodeCsvBytes(raw));
  const [header, ...body] = rows;

  const columnIndex = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const questionAt = columnIndex("question");
  const answerAt = columnIndex("answer");
  const categoryAt = columnIndex("category");
  const difficultyAt = columnIndex("difficulty");

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
        // Reference answers here are human-written and usable for grounding
        // evaluation, unlike the HR set's.
        answer: answer || null,
        category,
        difficulty: row[difficultyAt]?.trim() || null,
        types,
        roleTags,
        keywords: [],
        source: CORPUS_SOURCES.software,
        contentHash: hashQuestion(question),
      },
    ];
  });
}

async function loadHrRecords(): Promise<CorpusRecord[]> {
  const raw = await readFile(HR_CORPUS_PATH, "utf8");
  const entries = JSON.parse(raw) as { question: string; category: string; keywords: string[] }[];

  return entries.map((entry) => {
    const { types, roleTags } = mapHrCategory(entry.category);
    return {
      question: entry.question,
      // Deliberately null: the source's `ideal_answer` is generic, identical
      // across seniority levels, and echoes its own question. Behavioural
      // answers are graded on STAR structure instead.
      answer: null,
      category: entry.category,
      // Also deliberately null: the source labels every question Easy, Medium
      // AND Hard, so any value here would be noise.
      difficulty: null,
      types,
      roleTags,
      keywords: entry.keywords ?? [],
      source: CORPUS_SOURCES.hr,
      contentHash: hashQuestion(entry.question),
    };
  });
}

function dedupe(records: CorpusRecord[]): { unique: CorpusRecord[]; dropped: number } {
  const byHash = new Map<string, CorpusRecord>();
  let dropped = 0;

  for (const record of records) {
    const existing = byHash.get(record.contentHash);
    if (existing) {
      dropped++;
      // Keep whichever copy carries a reference answer.
      if (!existing.answer && record.answer) {
        byHash.set(record.contentHash, record);
      }
      continue;
    }
    byHash.set(record.contentHash, record);
  }

  return { unique: [...byHash.values()], dropped };
}

async function upsert(record: CorpusRecord, embedding: number[]): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "QuestionCorpus" (
      "id", "question", "answer", "category", "difficulty",
      "types", "roleTags", "keywords", "source", "contentHash",
      "embedding", "createdAt", "updatedAt"
    )
    VALUES (
      ${randomUUID()}, ${record.question}, ${record.answer}, ${record.category}, ${record.difficulty},
      ${record.types}::text[], ${record.roleTags}::text[], ${record.keywords}::text[],
      ${record.source}, ${record.contentHash},
      ${toVectorLiteral(embedding)}::vector, NOW(), NOW()
    )
    ON CONFLICT ("contentHash") DO UPDATE SET
      "question"   = EXCLUDED."question",
      "answer"     = COALESCE(EXCLUDED."answer", "QuestionCorpus"."answer"),
      "category"   = EXCLUDED."category",
      "difficulty" = EXCLUDED."difficulty",
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
  // Exercises parsing, mapping, dedupe and embedding without touching the
  // database — safe to run before the migration has been applied.
  const dryRun = args.includes("--dry-run");

  const records: CorpusRecord[] = [];

  if (source === "all" || source === "software") {
    const software = await loadSoftwareRecords(softwareCsv);
    console.log(`software: ${software.length} rows read from ${softwareCsv}`);
    records.push(...software);
  }

  if (source === "all" || source === "hr") {
    const hr = await loadHrRecords();
    console.log(`hr:       ${hr.length} rows read from ${HR_CORPUS_PATH}`);
    records.push(...hr);
  }

  if (records.length === 0) {
    throw new Error(`No records loaded (--source=${source})`);
  }

  const { unique, dropped } = dedupe(records);
  console.log(`\ndeduped:  ${unique.length} unique (${dropped} duplicates dropped)`);

  console.log("embedding...");
  const embeddings: number[][] = [];
  for (let i = 0; i < unique.length; i += EMBED_BATCH_SIZE) {
    const batch = unique.slice(i, i + EMBED_BATCH_SIZE);
    // Embed question and reference answer together where one exists: retrieval
    // matches on topic, and the answer text carries topic vocabulary the
    // (median 54-character) question often omits.
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
