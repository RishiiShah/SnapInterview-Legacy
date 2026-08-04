import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "@/lib/env";

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

// Cap the per-instance pg pool. On serverless each invocation handles ~one request
// at a time, so a single connection is enough; this stops a burst of warm instances
// from exhausting the database pooler. Pair with a transaction-mode pooler URL in prod.
const prisma =
    (globalForPrisma.prisma && !isStale) ?
    globalForPrisma.prisma :
    new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 1 }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma };
