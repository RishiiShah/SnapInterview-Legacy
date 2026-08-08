import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const { cleanupExpiredRateLimitBuckets } = vi.hoisted(() => ({
  cleanupExpiredRateLimitBuckets: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/env", () => ({
  env: { CRON_SECRET: "test-secret" },
}));

vi.mock("@/utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/rate-limit", () => ({ cleanupExpiredRateLimitBuckets }));

function makeRequest(authHeader?: string) {
  return new Request("http://localhost/api/cron/cleanup", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authorization header", async () => {
    const res = await GET(makeRequest() as never);
    expect(res.status).toBe(401);
  });

  it("returns 401 when bearer token is wrong", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret") as never);
    expect(res.status).toBe(401);
  });

  it("removes one bounded batch of expired rate-limit buckets", async () => {
    cleanupExpiredRateLimitBuckets.mockResolvedValueOnce(23);

    const res = await GET(makeRequest("Bearer test-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ deleted: 23 });
    expect(cleanupExpiredRateLimitBuckets).toHaveBeenCalledWith(5_000);
  });
});
