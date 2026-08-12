import crypto from "crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { env } from "@/lib/env";

interface RateLimitResult {
  limited: boolean;
  resetAt: Date;
}

interface RateLimiter {
  /** Returns true if the key is rate limited (request should be rejected). */
  isLimited(key: string): Promise<boolean>;
  /** Returns true if the key is currently at or over the limit, without consuming a token. */
  checkLimit(key: string): Promise<boolean>;
}

const CLEANUP_SAMPLE_RATE = 0.01;
const MAX_KEY_LENGTH = 512;
const inMemoryBuckets = new Map<string, { count: number; resetAtMs: number }>();

function hashRateLimitKey(namespace: string, rawKey: string) {
  return crypto
    .createHash("sha256")
    .update(`${namespace}:${rawKey}`)
    .digest("hex");
}

function windowStartFor(nowMs: number, windowMs: number) {
  return new Date(Math.floor(nowMs / windowMs) * windowMs);
}

function consumeInMemoryFixedWindow(
  namespace: string,
  rawKey: string,
  windowMs: number,
  maxRequests: number
): RateLimitResult {
  const nowMs = Date.now();
  const safeKey = rawKey.slice(0, MAX_KEY_LENGTH);
  const bucketKey = `${namespace}:${safeKey}:${Math.floor(nowMs / windowMs)}`;
  const resetAtMs = (Math.floor(nowMs / windowMs) + 1) * windowMs;
  const existing = inMemoryBuckets.get(bucketKey);
  const count = (existing?.count ?? 0) + 1;

  inMemoryBuckets.set(bucketKey, { count, resetAtMs });

  // Opportunistic cleanup to keep memory bounded.
  if (Math.random() <= CLEANUP_SAMPLE_RATE) {
    for (const [key, value] of inMemoryBuckets) {
      if (value.resetAtMs <= nowMs) {
        inMemoryBuckets.delete(key);
      }
    }
  }

  return {
    limited: count > maxRequests,
    resetAt: new Date(resetAtMs),
  };
}

function shouldFallbackToInMemory(error: unknown): boolean {
  const transientNetworkCodes = new Set([
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EHOSTUNREACH",
  ]);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const code = String(error.code ?? "").toUpperCase();

    // P1001/P1002/P2028 are transient connection/timeout issues.
    if (code === "P1001" || code === "P1002" || code === "P2028") {
      return true;
    }

    // Some adapters surface node-style socket errors in code.
    if (transientNetworkCodes.has(code)) {
      return true;
    }

    // P2010 raw query failure can happen when the table is not migrated yet.
    if (code === "P2010") {
      const meta = error.meta as { message?: string; driverAdapterError?: { message?: string } } | undefined;
      const message = `${meta?.message ?? ""} ${meta?.driverAdapterError?.message ?? ""}`.toLowerCase();
      if (message.includes("rate_limit_buckets") || message.includes("tabledoesnotexist")) {
        // Fail closed: missing schema cannot silently degrade security by falling back.
        return false;
      }

      if (
        message.includes("econnrefused") ||
        message.includes("connection refused") ||
        message.includes("timeout")
      ) {
        return true;
      }
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof TypeError) {
    const message = String(error.message).toLowerCase();
    if (
      message.includes("$queryraw") ||
      message.includes("$executeraw") ||
      message.includes("econnrefused") ||
      message.includes("connection refused") ||
      message.includes("fetch failed") ||
      message.includes("timeout")
    ) {
      return true;
    }
  }

  return false;
}

export async function cleanupExpiredRateLimitBuckets(limit = 5_000): Promise<number> {
  const expiredBuckets = await prisma.rateLimitBucket.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: Math.min(Math.max(limit, 1), 10_000),
  });

  if (expiredBuckets.length === 0) return 0;

  const result = await prisma.rateLimitBucket.deleteMany({
    where: { id: { in: expiredBuckets.map((bucket) => bucket.id) } },
  });
  return result.count;
}

async function consumeFixedWindow(
  namespace: string,
  rawKey: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const nowMs = Date.now();
  const safeRawKey = (rawKey || "unknown").slice(0, MAX_KEY_LENGTH);
  const windowStart = windowStartFor(nowMs, windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
  const keyHash = hashRateLimitKey(namespace, safeRawKey);

  if (typeof prisma.$queryRaw !== "function") {
    return consumeInMemoryFixedWindow(namespace, safeRawKey, windowMs, maxRequests);
  }

  try {
    const bucket = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      INSERT INTO "rate_limit_buckets" (
        "id",
        "namespace",
        "keyHash",
        "windowStart",
        "windowMs",
        "count",
        "expiresAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${namespace},
        ${keyHash},
        ${windowStart},
        ${windowMs},
        1,
        ${expiresAt},
        NOW(),
        NOW()
      )
      ON CONFLICT ("namespace", "keyHash", "windowStart")
      DO UPDATE SET
        "count" = "rate_limit_buckets"."count" + 1,
        "updatedAt" = NOW()
      RETURNING "count"
    `;

    const requestCount = Number(bucket[0]?.count ?? 0);

    return {
      limited: requestCount > maxRequests,
      resetAt: expiresAt,
    };
  } catch (error) {
    const isProduction = env.NODE_ENV === "production";
    
    if (isProduction) {
      logger.error("Rate limiter database error - FAILING CLOSED (LIMITING)", {
        namespace,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        limited: true,
        resetAt: new Date(Date.now() + 60000), // Default 1m reset
      };
    }

    if (shouldFallbackToInMemory(error)) {
      logger.warn("Rate limiter falling back to in-memory storage due to database error", {
        namespace,
        error: error instanceof Error ? error.message : String(error),
      });
      return consumeInMemoryFixedWindow(namespace, safeRawKey, windowMs, maxRequests);
    }

    throw error;
  }
}

async function checkFixedWindow(
  namespace: string,
  rawKey: string,
  windowMs: number,
  maxRequests: number
): Promise<boolean> {
  const nowMs = Date.now();
  const safeRawKey = (rawKey || "unknown").slice(0, MAX_KEY_LENGTH);
  const windowStart = windowStartFor(nowMs, windowMs);
  const keyHash = hashRateLimitKey(namespace, safeRawKey);

  if (typeof prisma.$queryRaw !== "function") {
    const bucketKey = `${namespace}:${safeRawKey}:${Math.floor(nowMs / windowMs)}`;
    const count = inMemoryBuckets.get(bucketKey)?.count ?? 0;
    return count >= maxRequests;
  }

  try {
    const bucket = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT "count" FROM "rate_limit_buckets"
      WHERE "namespace" = ${namespace}
        AND "keyHash" = ${keyHash}
        AND "windowStart" = ${windowStart}
    `;
    const count = Number(bucket[0]?.count ?? 0);
    return count >= maxRequests;
  } catch (error) {
    if (shouldFallbackToInMemory(error)) {
      const bucketKey = `${namespace}:${safeRawKey}:${Math.floor(nowMs / windowMs)}`;
      const count = inMemoryBuckets.get(bucketKey)?.count ?? 0;
      return count >= maxRequests;
    }
    // Default to not limited on error during check
    return false;
  }
}

/**
 * Creates a Postgres-backed fixed-window rate limiter.
 * Semantics: maxRequests per windowMs per key.
 */
export function createRateLimiter(
  namespace: string,
  windowMs: number,
  maxRequests: number
): RateLimiter {
  return {
    async isLimited(key: string): Promise<boolean> {
      const result = await consumeFixedWindow(
        namespace,
        key,
        windowMs,
        maxRequests
      );
      return result.limited;
    },
    async checkLimit(key: string): Promise<boolean> {
      return checkFixedWindow(
        namespace,
        key,
        windowMs,
        maxRequests
      );
    },
  };
}
