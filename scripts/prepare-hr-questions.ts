/**
 * Collapses the raw HR interview dataset into a committable artifact.
 *
 * The source is 1.1GB / 2,500,000 rows but contains only 40 unique questions —
 * it is a cartesian product of 40 questions x 8 roles x 9 experience levels
 * x 3 difficulties x 4 source types, sampled with replacement. Of its metadata
 * only `category` is real (exactly one per question); `role`, `experience`,
 * `difficulty` and `source_type` were each verified to take every possible
 * value for every question, so they are noise and are dropped here rather than
 * carried into the database where someone would eventually filter on them.
 *
 * `ideal_answer` is also dropped: it is 1:1 with the question (so it does not
 * vary by role or seniority the way a reference answer must) and each one ends
 * by echoing its own question verbatim.
 *
 * Output is ~15KB and gets committed, so ingestion is deterministic, reviewable
 * and runnable in CI without the 1.1GB input.
 *
 * Usage:
 *   npx tsx scripts/prepare-hr-questions.ts <path-to-raw.json>
 */
import { createReadStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { HR_CATEGORIES } from "../src/lib/rag/taxonomy";

const OUTPUT_PATH = path.join(process.cwd(), "src/data/corpus/hr-questions.json");

interface RawHrRecord {
  question: string;
  category: string;
  keywords?: string[];
}

interface PreparedHrQuestion {
  question: string;
  category: string;
  keywords: string[];
}

/**
 * Yields top-level objects from a large JSON array without holding the whole
 * document in memory. `JSON.parse` on the raw file needs multiple GB of heap.
 */
async function* streamArrayObjects(filePath: string): AsyncGenerator<string> {
  const stream = createReadStream(filePath, { encoding: "utf8", highWaterMark: 1 << 20 });

  // Only ever holds the tail of an object that straddles a chunk boundary, so
  // memory stays flat regardless of input size.
  let carry = "";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for await (const chunk of stream) {
    // A chunk that begins mid-object continues from its first character.
    let start = depth > 0 ? 0 : -1;

    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }

      if (char === "{") {
        if (depth === 0) {
          start = i;
        }
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          yield carry + chunk.slice(start, i + 1);
          carry = "";
          start = -1;
        }
      }
    }

    if (depth > 0 && start !== -1) {
      carry += chunk.slice(start);
    }
  }
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: npx tsx scripts/prepare-hr-questions.ts <path-to-raw.json>");
    process.exit(1);
  }

  const byQuestion = new Map<string, PreparedHrQuestion>();
  const categoriesSeen = new Map<string, Set<string>>();
  let scanned = 0;

  for await (const raw of streamArrayObjects(inputPath)) {
    let record: RawHrRecord;
    try {
      record = JSON.parse(raw) as RawHrRecord;
    } catch {
      continue;
    }

    scanned++;
    if (scanned % 500_000 === 0) {
      console.log(`  scanned ${scanned.toLocaleString()} rows, ${byQuestion.size} unique questions`);
    }

    const question = record.question?.trim();
    const category = record.category?.trim();
    if (!question || !category) {
      continue;
    }

    // Track category spread so a future dataset that breaks the 1:1
    // question->category assumption fails loudly instead of silently.
    const seen = categoriesSeen.get(question) ?? new Set<string>();
    seen.add(category);
    categoriesSeen.set(question, seen);

    const existing = byQuestion.get(question);
    if (existing) {
      for (const keyword of record.keywords ?? []) {
        if (!existing.keywords.includes(keyword)) {
          existing.keywords.push(keyword);
        }
      }
      continue;
    }

    byQuestion.set(question, {
      question,
      category,
      keywords: [...new Set(record.keywords ?? [])],
    });
  }

  const ambiguous = [...categoriesSeen.entries()].filter(([, categories]) => categories.size > 1);
  if (ambiguous.length > 0) {
    console.warn(
      `WARNING: ${ambiguous.length} question(s) carry multiple categories. ` +
        "The one-category-per-question assumption no longer holds; review the mapping."
    );
  }

  const unmapped = [...new Set([...byQuestion.values()].map((q) => q.category))].filter(
    (category) => !HR_CATEGORIES.includes(category)
  );
  if (unmapped.length > 0) {
    console.warn(`WARNING: categories missing from HR_CATEGORY_MAP: ${unmapped.join(", ")}`);
  }

  const prepared = [...byQuestion.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.question.localeCompare(b.question)
  );

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(prepared, null, 2)}\n`, "utf8");

  console.log(`\nScanned ${scanned.toLocaleString()} rows -> ${prepared.length} unique questions`);
  console.log(`Categories: ${new Set(prepared.map((q) => q.category)).size}`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
