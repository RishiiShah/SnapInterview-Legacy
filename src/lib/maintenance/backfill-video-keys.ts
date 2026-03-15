import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const prisma = new PrismaClient({
  // eslint-disable-next-line no-process-env
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

function deriveVideoKeyFromUrl(videoUrl: string | null) {
  if (!videoUrl) {
    return null;
  }

  try {
    const url = new URL(videoUrl);
    const pathname = url.pathname.replace(/^\/+/, "");
    return pathname || null;
  } catch {
    return null;
  }
}

async function main() {
  const applyChanges = process.argv.includes("--write");
  const verbose = process.argv.includes("--verbose");
  const sessions = await prisma.interviewSession.findMany({
    where: {
      videoKey: null,
      NOT: {
        videoUrl: null,
      },
    },
    select: {
      id: true,
      videoUrl: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (sessions.length === 0) {
    console.log("No interview sessions need videoKey backfill.");
    return;
  }

  const candidates = sessions
    .map((session) => ({
      id: session.id,
      videoUrl: session.videoUrl,
      videoKey: deriveVideoKeyFromUrl(session.videoUrl),
    }))
    .filter((session) => session.videoKey);

  console.log(`Found ${sessions.length} interview sessions with legacy videoUrl metadata.`);
  console.log(`Derived ${candidates.length} video keys from persisted URLs.`);

  if (!applyChanges) {
    if (verbose) {
      for (const candidate of candidates) {
        console.log(`[dry-run] ${candidate.id} -> ${candidate.videoKey}`);
      }
    }
    console.log("Run `npm run backfill:video-keys -- --write` to persist these updates.");
    console.log("Add `--verbose` to print per-session mappings.");
    return;
  }

  for (const candidate of candidates) {
    await prisma.interviewSession.update({
      where: { id: candidate.id },
      data: { videoKey: candidate.videoKey },
    });
    if (verbose) {
      console.log(`[updated] ${candidate.id} -> ${candidate.videoKey}`);
    }
  }

  console.log(`Updated ${candidates.length} interview sessions.`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
