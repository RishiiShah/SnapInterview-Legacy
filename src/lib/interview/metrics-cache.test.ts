import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstableCache: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
  revalidatePath: mocks.revalidatePath,
  unstable_cache: mocks.unstableCache,
}));

vi.mock("@/lib/env", () => ({
  env: { NODE_ENV: "production" },
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { getAnalyticsOverviewData, invalidateInterviewMetricsCache } from "./metrics";

describe("interview metrics cache invalidation", () => {
  it("invalidates only the changed user's dashboard and analytics entries", () => {
    invalidateInterviewMetricsCache("user-42");

    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(1, "interview-dashboard-metrics-v1:user-42", "max");
    expect(mocks.revalidateTag).toHaveBeenNthCalledWith(2, "interview-analytics-metrics-v2:user-42", "max");
    expect(mocks.revalidateTag).toHaveBeenCalledTimes(2);
  });

  it("uses the current analytics payload version for each user's cache entry", async () => {
    mocks.unstableCache.mockReturnValue(async () => ({ cached: true }));

    await expect(getAnalyticsOverviewData("user-42")).resolves.toEqual({ cached: true });

    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["analytics-overview-v2", "user-42"],
      expect.objectContaining({
        revalidate: 300,
        tags: ["interview-analytics-metrics-v2", "interview-analytics-metrics-v2:user-42"],
      }),
    );
  });
});
