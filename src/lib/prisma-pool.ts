const DEFAULT_DEVELOPMENT_POOL_MAX = 2;
const DEFAULT_PRODUCTION_POOL_MAX = 2;
const MAX_POOL_MAX = 10;

type PrismaPoolMaxOptions = {
  nodeEnv?: string;
  configuredValue?: string | undefined;
};

/**
 * Keeps overlapping requests from queueing behind one local connection while
 * preserving a deliberately small per-instance footprint in production.
 */
export function getPrismaPoolMax({
  nodeEnv = process.env.NODE_ENV,
  configuredValue = process.env.DATABASE_POOL_MAX,
}: PrismaPoolMaxOptions = {}): number {
  const parsed = Number(configuredValue);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_POOL_MAX) {
    return parsed;
  }

  return nodeEnv === "production"
    ? DEFAULT_PRODUCTION_POOL_MAX
    : DEFAULT_DEVELOPMENT_POOL_MAX;
}
