import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "@/lib/env";
import { getPrismaPoolMax } from "@/lib/prisma-pool";

const connectionString = env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// In development, the PrismaClient instance might be cached in globalThis.
// If the schema changes and the client is regenerated, the cached instance
// will be stale and missing new models. We check if a reliable model (like User)
// and new models (like PracticeQuestion) are available.
const isStale = 
  globalForPrisma.prisma && 
  (!("user" in globalForPrisma.prisma) ||
    !("practiceQuestion" in globalForPrisma.prisma) ||
    !("codingQuestion" in globalForPrisma.prisma));

// Permit a small amount of request overlap. A pool of one serializes page renders,
// auth reads, and API calls behind the same connection; production remains capped
// at two connections per warm instance unless DATABASE_POOL_MAX overrides it.
const prisma =
    (globalForPrisma.prisma && !isStale) ?
    globalForPrisma.prisma :
    new PrismaClient({ adapter: new PrismaPg({ connectionString, max: getPrismaPoolMax() }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma };
