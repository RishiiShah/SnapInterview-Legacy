import { prisma } from "../src/lib/prisma";
import { QUESTIONS } from "../src/data/questions";

async function main() {
  let created = 0;
  let skipped = 0;

  for (const q of QUESTIONS) {
    const existing = await prisma.practiceQuestion.findUnique({
      where: { slug: q.slug },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.practiceQuestion.create({
      data: {
        slug: q.slug,
        text: q.text,
        category: q.category,
        difficulty: q.difficulty,
        estimatedTime: q.estimatedTime || null,
        tags: q.tags,
        hint: q.hint || null,
        sampleAnswer: q.sampleAnswer || null,
      },
    });
    created++;
  }

  console.log(`Done: ${created} created, ${skipped} skipped (already exist)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
